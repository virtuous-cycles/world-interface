// Ring 2. Senses: the chain. Balances and inbound transfers. Lands as senses.chain.*
//
// The mind can see money arrive. It cannot move it from here. That is treasury's job,
// and treasury's job is mostly to say no.

import type { Balance, KernelContext, Wallet } from "../types.js";
import type { Ledger } from "../treasury/ledger.js";

export async function senseChain(ctx: KernelContext, wallets: Wallet[]): Promise<Balance[]> {
  const r = await ctx.syscall<{ wallets: Wallet[] }, Balance[]>("sys_read_chain", { wallets });
  if (!r.ok || !r.value) return [];
  for (const b of r.value) {
    ctx.emit("senses.chain.balance", { chain: b.wallet.chain, label: b.wallet.label, usd: b.usd, tokens: b.tokens.length });
  }
  return r.value;
}

export function registerChain(sys: { register: Function }, ledger: Ledger): void {
  sys.register("sys_read_chain", async (req: { args: { wallets: Wallet[] } }) => ledger.snapshot(req.args.wallets));
}
