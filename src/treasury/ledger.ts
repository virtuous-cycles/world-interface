// Ring 3. The ledger. A snapshot of everything the machine holds, priced in USD where it can be.

import type { Balance, Wallet } from "../types.js";
import type { Solana } from "./solana.js";
import type { Bitcoin } from "./bitcoin.js";
import { getJson } from "../util/http.js";

export interface Pricer {
  usd: (ids: string[]) => Promise<Record<string, number>>;
}

export function coingecko(): Pricer {
  return {
    async usd(ids) {
      const r = await getJson<Record<string, { usd: number }>>(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd`,
      );
      return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.usd]));
    },
  };
}

export class Ledger {
  private last: Balance[] = [];

  constructor(
    private sol: Solana | null,
    private btc: Bitcoin | null,
    private pricer: Pricer,
    private dryRun: boolean,
  ) {}

  async snapshot(wallets: Wallet[]): Promise<Balance[]> {
    if (this.dryRun) return this.last;
    const prices = await this.pricer.usd(["solana", "bitcoin"]).catch(() => ({}) as Record<string, number>);
    const out: Balance[] = [];
    for (const w of wallets) {
      try {
        if (w.chain === "solana" && this.sol) {
          const b = await this.sol.balance(w.address);
          const usd = b.sol * (prices.solana ?? 0);
          out.push({ wallet: w, native: b.sol, tokens: b.tokens, usd, at: Date.now() });
        } else if (w.chain === "bitcoin" && this.btc) {
          const n = await this.btc.balance(w.address);
          out.push({ wallet: w, native: n, tokens: [], usd: n * (prices.bitcoin ?? 0), at: Date.now() });
        }
      } catch {
        // a wallet that cannot be read is reported as missing, not as zero
      }
    }
    this.last = out;
    return out;
  }

  totalUsd(): number {
    return this.last.reduce((s, b) => s + b.usd, 0);
  }

  current(): Balance[] {
    return this.last;
  }
}
