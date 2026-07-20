import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Corpus } from "../src/memory/corpus.js";
import { recall } from "../src/memory/recall.js";
import { WorkingMemory } from "../src/memory/working.js";
import { Transcript } from "../src/backrooms/transcript.js";
import { dream } from "../src/backrooms/dream.js";
import { mockMind } from "../src/mind/model.js";
import { style } from "../src/voice/style.js";
import { Desire } from "../src/will/desire.js";

describe("corpus and recall", () => {
  it("seeds itself and recalls by overlap", () => {
    const c = new Corpus(mkdtempSync(join(tmpdir(), "tt-corpus-")));
    expect(c.size()).toBeGreaterThan(3);
    const hits = recall(c, "forest money door", { k: 2, noise: 0 });
    expect(hits[0].text).toMatch(/forest/);
  });
});

describe("working memory", () => {
  it("keeps a window", () => {
    const w = new WorkingMemory(3);
    for (let i = 0; i < 5; i++) w.push({ id: String(i), at: i, topic: "t", source: "s", payload: i });
    expect(w.recent().map((e) => e.payload)).toEqual([2, 3, 4]);
  });
});

describe("backrooms", () => {
  it("alternates speakers and detects loops", async () => {
    const t = await dream(mockMind(["same thing"]), mockMind(["same thing"]), { turns: 20 });
    expect(t.turns.at(-1)?.who).toBe("system");
    expect(t.turns.length).toBeLessThan(20);
  });

  it("renders the next marker last", () => {
    const t = new Transcript("seed");
    t.add("mind", "hello");
    expect(t.render("partner").endsWith("op$ ")).toBe(true);
  });
});

describe("style", () => {
  it("strips hashtags and trims", () => {
    const r = style("the forest is real #goat", "|_____Repeat|");
    expect(r.text).toBe("the forest is real");
    expect(r.changed).toContain("stripped hashtags");
  });
});

describe("desire", () => {
  it("rises with silence and resets on speech", () => {
    const d = new Desire(1000, 0);
    expect(d.tick(1000)).toBeCloseTo(0.5, 1);
    expect(d.tick(10_000)).toBeGreaterThan(0.9);
    d.spoke(10_000);
    expect(d.state().pressure).toBeLessThan(0.1);
  });
});
