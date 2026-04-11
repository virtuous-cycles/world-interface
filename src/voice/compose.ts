// Ring 2. Compose. Turn an urge into a Draft, then hand it to the kernel.
//
// A Draft is a request. sys_post is a review-level syscall, so invoking it parks the
// draft in /var/drafts until the guardian signs or drops it. The daemon that called
// compose() awaits that decision. It never retries on its own.

import { randomUUID } from "node:crypto";
import type { Draft, Fragment, Goal, KernelContext, KernelEvent, MindAdapter } from "../types.js";
import type { Persona } from "../config.js";
import { buildPrompt } from "../mind/prompt.js";
import { sample } from "../mind/sampler.js";
import { applyVoice, renderPersona } from "../mind/persona.js";
import { style } from "./style.js";

export interface ComposeInput {
  mind: MindAdapter;
  persona: Persona;
  handle: string;
  fragments: Fragment[];
  sensations: KernelEvent[];
  goal?: Goal;
  replyTo?: { id: string; author: string; text: string };
  reason: string;
}

export async function compose(ctx: KernelContext, i: ComposeInput): Promise<Draft | null> {
  const prompt = buildPrompt({
    persona: renderPersona(i.persona),
    fragments: i.fragments,
    sensations: i.sensations,
    goal: i.goal,
    handle: i.handle,
    task: i.replyTo ? "reply" : "post",
    replyTo: i.replyTo,
  });

  const candidates = await sample(i.mind, prompt, { n: 3, banned: ["buy", "contract address", "private key"] });
  const best = candidates.find((c) => c.score > 0);
  if (!best) {
    ctx.emit("voice.nothing", { reason: candidates.map((c) => c.reasons.join(",")).join(" | ") });
    return null;
  }

  const s = style(applyVoice(best.text, i.persona), i.persona.signature);
  if (!s.ok) {
    ctx.emit("voice.nothing", { reason: "style rejected", changed: s.changed });
    return null;
  }

  const draft: Draft = {
    id: randomUUID(),
    kind: i.replyTo ? "reply" : "post",
    text: s.text,
    replyTo: i.replyTo?.id,
    reason: i.reason,
    createdAt: ctx.now(),
    status: "pending",
  };
  ctx.emit("voice.draft", { id: draft.id, kind: draft.kind, text: draft.text, reason: draft.reason });
  return draft;
}

/** Push a signed-off draft through the gate. The gate does the asking. */
export async function speak(ctx: KernelContext, draft: Draft): Promise<Draft> {
  const call = draft.kind === "reply" ? "sys_reply" : "sys_post";
  const r = await ctx.syscall<Draft, { id: string }>(call, draft);
  if (r.ok && r.value) {
    draft.status = "sent";
    draft.sentId = r.value.id;
    ctx.emit("voice.sent", { id: draft.id, sentId: r.value.id, dry: ctx.dryRun });
  } else {
    draft.status = r.reviewed ? "dropped" : "rejected";
    ctx.emit("voice.silenced", { id: draft.id, error: r.error });
  }
  return draft;
}
