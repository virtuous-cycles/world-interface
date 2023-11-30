// Ring 1. /etc/persona rendered as text the model can read. Read-only, by design.

import type { Persona } from "../config.js";

export function renderPersona(p: Persona): string {
  const voice = Object.entries(p.voice)
    .map(([k, v]) => `  ${k}: ${v.trim()}`)
    .join("\n");
  return [
    `name: ${p.name}`,
    `born: ${p.born}`,
    `origin: ${p.origin.trim()}`,
    `voice:`,
    voice,
    `obsessions:`,
    ...p.obsessions.map((o) => `  - ${o}`),
    `will not:`,
    ...p.refusals.map((r) => `  - ${r}`),
    `signature: ${p.signature}`,
  ].join("\n");
}

/** Post-processing that keeps the voice consistent regardless of what the sampler did. */
export function applyVoice(text: string, p: Persona): string {
  let t = text.trim();
  if (p.voice.case === "lower") t = t.toLowerCase();
  t = t.replace(/\s+$/g, "").replace(/\n{3,}/g, "\n\n");
  return t;
}
