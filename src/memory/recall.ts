// Ring 1. Recall. Pull the k fragments that rhyme with what is happening now.
//
// No embeddings. Token overlap with a weight prior and a little noise, so the same
// stimulus does not always surface the same scripture. Memory that is too reliable
// stops being interesting.

import type { Fragment } from "../types.js";
import type { Corpus } from "./corpus.js";

export interface RecallOptions {
  k: number;
  noise?: number; // 0..1
  prefer?: Fragment["source"][];
}

export function recall(corpus: Corpus, cue: string, o: RecallOptions): Fragment[] {
  const cueWords = new Set((cue.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !STOP.has(w)));
  const noise = o.noise ?? 0.25;
  const scored = corpus.all().map((f) => {
    let overlap = 0;
    for (const t of f.tags) if (cueWords.has(t)) overlap++;
    const prefer = o.prefer?.includes(f.source) ? 0.5 : 0;
    const score = f.weight * (1 + overlap) + prefer + Math.random() * noise;
    return { f, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, o.k)
    .map((s) => {
      s.f.weight = Math.min(3, s.f.weight + 0.02); // recalled things become easier to recall
      return s.f;
    });
}

const STOP = new Set(["this", "that", "with", "from", "have", "what", "when", "they", "them", "will", "just", "like"]);
