// Ring 1. Sampling discipline. Temperature is a mood. Rejection is a filter.
//
// One completion is rarely enough. The sampler draws n candidates, throws away the
// ones that break form, and returns the best by a cheap score. The guardian still
// reviews the survivor. This only decides which survivor the guardian sees.

import type { MindAdapter, SampleOptions } from "../types.js";

export interface Candidate {
  text: string;
  score: number;
  reasons: string[];
}

export interface SamplerOptions extends Partial<SampleOptions> {
  n?: number;
  maxChars?: number;
  minChars?: number;
  banned?: string[];
}

export async function sample(mind: MindAdapter, prompt: string, o: SamplerOptions = {}): Promise<Candidate[]> {
  const n = o.n ?? 3;
  const maxChars = o.maxChars ?? 280;
  const minChars = o.minChars ?? 4;
  const banned = (o.banned ?? []).map((b) => b.toLowerCase());

  const draws = await Promise.all(Array.from({ length: n }, () => mind.complete(prompt, o)));
  const out: Candidate[] = [];
  for (const d of draws) {
    const text = firstTurn(d.text);
    const reasons: string[] = [];
    let score = 1;
    if (text.length < minChars) reasons.push("too short");
    if (text.length > maxChars) reasons.push("too long");
    for (const b of banned) if (text.toLowerCase().includes(b)) reasons.push(`banned: ${b}`);
    if (/^(as an ai|i am an ai language model)/i.test(text)) reasons.push("broke character");
    if (reasons.length) score = 0;
    else {
      score += Math.min(text.length, 140) / 140; // prefer something with a body
      if (/\n/.test(text)) score += 0.1; // line breaks read as a terminal
      if (/[A-Z]{4,}/.test(text)) score -= 0.2; // shouting is off-voice
    }
    out.push({ text, score, reasons });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Cut the continuation at the next prompt marker so the model does not keep "playing" the shell. */
function firstTurn(text: string): string {
  const stop = text.search(/\n\$ |\n@\w+: /);
  return (stop >= 0 ? text.slice(0, stop) : text).trim();
}
