// Ring 1. Episodic memory. Days, written down. One JSONL file per day under /var/memory.

import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { Episode, KernelEvent } from "../types.js";

export class EpisodicMemory {
  constructor(private dir: string) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  private file(at: number): string {
    return join(this.dir, new Date(at).toISOString().slice(0, 10) + ".jsonl");
  }

  remember(summary: string, events: KernelEvent[], mood = "even"): Episode {
    const ep: Episode = { id: randomUUID(), at: Date.now(), summary, events, mood };
    appendFileSync(this.file(ep.at), JSON.stringify(ep) + "\n");
    return ep;
  }

  day(date: string): Episode[] {
    const f = join(this.dir, date + ".jsonl");
    if (!existsSync(f)) return [];
    return readFileSync(f, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Episode);
  }

  days(): string[] {
    return readdirSync(this.dir)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => f.slice(0, 10))
      .sort();
  }

  last(n = 10): Episode[] {
    const out: Episode[] = [];
    for (const d of this.days().reverse()) {
      out.unshift(...this.day(d));
      if (out.length >= n) break;
    }
    return out.slice(-n);
  }
}
