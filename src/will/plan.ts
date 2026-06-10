// Ring 1. Plan. Given pressure, senses and a goal, decide what kind of thing to do next.
//
// Returns an intent, never an action. Actions are syscalls, and syscalls go through the gate.

import type { Goal, KernelEvent } from "../types.js";
import type { Desire } from "./desire.js";

export type Intent =
  | { kind: "reply"; to: { id: string; author: string; text: string }; reason: string }
  | { kind: "post"; reason: string }
  | { kind: "dream"; reason: string }
  | { kind: "wait"; reason: string };

export function plan(desire: Desire, recent: KernelEvent[], goal: Goal | undefined, now: number): Intent {
  const pressure = desire.tick(now);
  const mention = [...recent].reverse().find((e) => e.topic === "senses.mention");
  if (mention) {
    const m = mention.payload as { id: string; author: string; text: string };
    return { kind: "reply", to: m, reason: `someone said my name: @${m.author}` };
  }
  const money = recent.find((e) => e.topic === "senses.chain.balance" && (e.payload as { usd: number }).usd > 0);
  if (money && pressure > 0.4) {
    return { kind: "post", reason: "the treasury moved and i have something to say about it" };
  }
  if (desire.wants()) {
    return { kind: "post", reason: goal ? `pressure ${pressure.toFixed(2)} and i want ${goal.title}` : `pressure ${pressure.toFixed(2)}` };
  }
  if (pressure < 0.15 && recent.length === 0) {
    return { kind: "dream", reason: "nothing is happening. go to the backrooms" };
  }
  return { kind: "wait", reason: `pressure ${pressure.toFixed(2)}, below threshold` };
}
