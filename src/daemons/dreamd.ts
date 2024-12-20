// Ring 1 daemon. Goes to the backrooms on a schedule and brings back new corpus.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { KernelContext } from "../types.js";
import type { System } from "../boot/init.js";
import { dream } from "../backrooms/dream.js";

export function dreamd(sys: System, turns: number) {
  return async (ctx: KernelContext): Promise<void> => {
    const max = Math.min(turns, sys.config.policy.limits.dream_turns_max);
    ctx.emit("dream.start", { turns: max });
    const t = await dream(sys.mind, sys.partner, {
      turns: max,
      onTurn: (who, text, i) => ctx.emit("dream.turn", { i, who, text: text.slice(0, 200) }),
    });
    const file = join(sys.config.system.memory.corpus_path, `dream-${new Date(t.startedAt).toISOString().replace(/[:.]/g, "-")}.txt`);
    writeFileSync(file, t.toCorpus());
    let added = 0;
    for (const chunk of t.toCorpus().split(/\n\s*\n/)) {
      if (chunk.trim().length < 12) continue;
      sys.corpus.add({ source: "backrooms", text: chunk.trim(), at: ctx.now(), weight: 0.8, tags: [] });
      added++;
    }
    await ctx.syscall("sys_write_memory", { summary: `dreamed ${t.turns.length} turns, kept ${added} fragments`, mood: "drifting" });
    ctx.emit("dream.end", { turns: t.turns.length, fragments: added, file });
  };
}
