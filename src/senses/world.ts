// Ring 2. Senses: the world. Anything that is not X and not the chain.
//
// Deliberately thin. Feeds here are plain RSS or JSON lists that someone chose on
// purpose. The mind does not browse. Browsing is how a terminal gets a virus.

import type { KernelContext } from "../types.js";
import { getJson } from "../util/http.js";

export interface WorldItem {
  title: string;
  url: string;
  at: number;
  source: string;
}

export async function senseWorld(ctx: KernelContext, feeds: { name: string; url: string }[]): Promise<WorldItem[]> {
  const out: WorldItem[] = [];
  for (const f of feeds) {
    try {
      const items = await getJson<{ items?: { title: string; url: string; date_published?: string }[] }>(f.url);
      for (const it of (items.items ?? []).slice(0, 10)) {
        const item = { title: it.title, url: it.url, at: Date.parse(it.date_published ?? "") || Date.now(), source: f.name };
        out.push(item);
        ctx.emit("senses.world.item", item);
      }
    } catch (err) {
      ctx.log("world feed failed", { feed: f.name, err: String(err) });
    }
  }
  return out;
}
