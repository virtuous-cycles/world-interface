// Ring 2 daemon. Looks at the world so the mind does not have to.

import type { KernelContext } from "../types.js";
import type { System } from "../boot/init.js";
import { senseTimeline } from "../senses/timeline.js";
import { senseMentions } from "../senses/mentions.js";
import { senseWorld } from "../senses/world.js";

const FEEDS = [{ name: "hn", url: "https://hnrss.org/frontpage.jsonfeed" }];

export function watchd(sys: System) {
  let sinceId: string | undefined;
  return async (ctx: KernelContext): Promise<void> => {
    const mentions = await senseMentions(ctx, sinceId);
    if (mentions.length) {
      sinceId = mentions[0].id;
      for (const _ of mentions) sys.desire.heard(ctx.now());
    }
    await senseTimeline(ctx, sys.x, 30);
    if (!ctx.dryRun) await senseWorld(ctx, FEEDS);
    ctx.emit("senses.tick", { mentions: mentions.length, pressure: sys.desire.state().pressure.toFixed(2) });
  };
}
