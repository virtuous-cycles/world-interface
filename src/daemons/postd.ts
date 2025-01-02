// Ring 2 daemon. Feels the pressure, forms an intent, composes a draft, asks the gate.
//
// Runs every minute. Most minutes it does nothing, and says so on the bus.

import type { KernelContext } from "../types.js";
import type { System } from "../boot/init.js";
import { plan } from "../will/plan.js";
import { recall } from "../memory/recall.js";
import { compose, speak } from "../voice/compose.js";

export function postd(sys: System) {
  return async (ctx: KernelContext): Promise<void> => {
    const now = ctx.now();
    const recent = sys.working.recent(16);
    const goal = sys.goals.active();
    const intent = plan(sys.desire, recent, goal, now);
    ctx.emit("will.intent", { kind: intent.kind, reason: intent.reason, pressure: sys.desire.state().pressure.toFixed(2) });

    if (intent.kind === "wait" || intent.kind === "dream") return;

    const cue = intent.kind === "reply" ? intent.to.text : [goal?.title, ...recent.map((e) => JSON.stringify(e.payload))].join(" ");
    const fragments = recall(sys.corpus, cue, { k: sys.config.system.memory.recall_k, prefer: ["scripture"] });

    const draft = await compose(ctx, {
      mind: sys.mind,
      persona: sys.config.persona,
      handle: sys.config.system.system.handle,
      fragments,
      sensations: recent,
      goal,
      replyTo: intent.kind === "reply" ? intent.to : undefined,
      reason: intent.reason,
    });
    if (!draft) return;

    sys.drafts.set(draft.id, draft);
    const sent = await speak(ctx, draft); // blocks here while the guardian reads it
    if (sent.status === "sent") {
      sys.desire.spoke(ctx.now());
      await ctx.syscall("sys_write_memory", { summary: `said: ${sent.text}`, mood: "spoken" });
    }
  };
}
