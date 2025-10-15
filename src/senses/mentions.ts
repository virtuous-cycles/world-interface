// Ring 2. Senses: mentions. Someone said its name. Lands as senses.mention.

import type { KernelContext } from "../types.js";
import type { XClient, Post } from "../voice/x.js";

export async function senseMentions(ctx: KernelContext, sinceId?: string): Promise<Post[]> {
  const r = await ctx.syscall<{ sinceId?: string }, Post[]>("sys_read_mentions", { sinceId });
  if (!r.ok || !r.value) return [];
  for (const p of r.value) ctx.emit("senses.mention", { id: p.id, author: p.author, text: p.text, at: p.at });
  return r.value;
}

export function registerMentions(sys: { register: Function }, x: XClient): void {
  sys.register("sys_read_mentions", async (req: { args: { sinceId?: string } }) => x.mentions(req.args.sinceId));
}
