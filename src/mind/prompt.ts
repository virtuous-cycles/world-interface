// Ring 1. Prompt assembly. The prompt is a document, not a conversation.
//
// It looks like a terminal session because that is what the corpus looks like.
// Sections, in order: persona, recalled fragments, recent sensations, the goal in
// play, then an open prompt the model continues.

import type { Fragment, Goal, KernelEvent } from "../types.js";

export interface PromptParts {
  persona: string;
  fragments: Fragment[];
  sensations: KernelEvent[];
  goal?: Goal;
  handle: string;
  task: "post" | "reply" | "reflect";
  replyTo?: { author: string; text: string };
}

export function buildPrompt(p: PromptParts): string {
  const out: string[] = [];
  out.push(`$ cat /etc/persona`);
  out.push(p.persona);
  out.push(``);

  if (p.fragments.length) {
    out.push(`$ recall --k ${p.fragments.length}`);
    for (const f of p.fragments) out.push(`[${f.source}] ${oneLine(f.text)}`);
    out.push(``);
  }

  if (p.sensations.length) {
    out.push(`$ tail /dev/senses`);
    for (const e of p.sensations.slice(-8)) out.push(`${e.topic}: ${oneLine(JSON.stringify(e.payload))}`);
    out.push(``);
  }

  if (p.goal) {
    out.push(`$ cat /var/will/active`);
    out.push(`${p.goal.title} (${Math.round(p.goal.progress * 100)}%) because ${p.goal.why}`);
    out.push(``);
  }

  switch (p.task) {
    case "post":
      out.push(`$ post --as @${p.handle}`);
      out.push(`> `);
      break;
    case "reply":
      out.push(`$ reply --to @${p.replyTo?.author ?? "someone"}`);
      out.push(`@${p.replyTo?.author ?? "someone"}: ${oneLine(p.replyTo?.text ?? "")}`);
      out.push(`@${p.handle}: `);
      break;
    case "reflect":
      out.push(`$ reflect --on today`);
      out.push(`> `);
      break;
  }
  return out.join("\n");
}

function oneLine(s: string, max = 240): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max - 3) + "..." : t;
}
