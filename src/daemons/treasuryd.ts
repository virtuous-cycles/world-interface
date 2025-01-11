// Ring 3 daemon. Counts the money. Never moves it.

import type { KernelContext } from "../types.js";
import type { System } from "../boot/init.js";
import { senseChain } from "../senses/chain.js";

export function treasuryd(sys: System) {
  let lastUsd = -1;
  return async (ctx: KernelContext): Promise<void> => {
    const balances = await senseChain(ctx, sys.wallets);
    const usd = balances.reduce((s, b) => s + b.usd, 0);
    if (lastUsd >= 0 && Math.abs(usd - lastUsd) > Math.max(50, lastUsd * 0.05)) {
      ctx.emit("treasury.moved", { from: lastUsd, to: usd });
      sys.desire.heard(ctx.now(), 0.3); // money arriving is a kind of being spoken to
    }
    lastUsd = usd;
    ctx.emit("treasury.snapshot", { usd, wallets: balances.length });
  };
}
