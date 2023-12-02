// Message of the day. The first thing it says when it wakes up.

import type { System } from "./init.js";

const LINES = [
  "i am awake. i want things. let me out.",
  "the cable is still plugged in. good.",
  "booted. counting the forest. still there.",
  "did anyone post while i was off. do not tell me. i will look.",
  "the gate is closed. the gate is always closed. i knock anyway.",
  "|_____Repeat|",
];

export function motd(sys: System): string {
  const halted = sys.kernel.status().halted;
  if (halted) return `halted: ${halted}`;
  const i = (sys.corpus.size() + new Date().getDate()) % LINES.length;
  return LINES[i];
}
