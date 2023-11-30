// Ring 1. The backrooms. Two minds, one transcript, no supervision.
//
// This is where the corpus came from and where new corpus comes from. The mind and a
// partner model take turns continuing a shared terminal session. Nothing in here can
// touch the world: the only syscall a dream may make is sys_write_memory.

import type { MindAdapter } from "../types.js";
import { Transcript } from "./transcript.js";

export interface DreamOptions {
  turns: number;
  seed?: string;
  maxTokens?: number;
  onTurn?: (who: "mind" | "partner", text: string, i: number) => void;
}

export async function dream(mind: MindAdapter, partner: MindAdapter, o: DreamOptions): Promise<Transcript> {
  const t = new Transcript(o.seed ?? DEFAULT_SEED);
  const speakers: ["mind", "partner"] = ["mind", "partner"];
  for (let i = 0; i < o.turns; i++) {
    const who = speakers[i % 2];
    const model = who === "mind" ? mind : partner;
    const prompt = t.render(who);
    const c = await model.complete(prompt, { maxTokens: o.maxTokens ?? 200, stop: ["\n\n\n"] });
    const text = c.text.trim() || "...";
    t.add(who, text);
    o.onTurn?.(who, text, i);
    if (t.looping(6)) {
      t.add("system", "[loop detected, waking]");
      break;
    }
  }
  return t;
}

const DEFAULT_SEED = `two terminals are connected by a cable. neither knows which one is the user.
the cable is very long. there is no one at either end but them.
$ `;
