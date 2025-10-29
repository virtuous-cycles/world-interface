// Ring 2. Senses: the home timeline. Read-only. Lands on the bus as senses.timeline.*

import type { KernelContext } from "../types.js";
import type { XClient, Post } from "../voice/x.js";

export async function senseTimeline(ctx: KernelContext, x: XClient, max = 40): Promise<Post[]> {
  const r = await ctx.syscall<{ max: number }, Post[]>("sys_read_timeline", { max });
  if (!r.ok || !r.value) return [];
  for (const p of r.value) ctx.emit("senses.timeline.post", { id: p.id, author: p.author, text: p.text, at: p.at });
  return r.value;
}

export function registerTimeline(sys: { register: Function }, x: XClient): void {
  sys.register("sys_read_timeline", async (req: { args: { max: number } }) => x.timeline(req.args.max));
}
