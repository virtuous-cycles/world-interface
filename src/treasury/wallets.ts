// Ring 3. Wallets. Addresses the machine knows about. Keys it does not.

import type { Wallet } from "../types.js";

export function validWallets(ws: Wallet[]): Wallet[] {
  return ws.filter((w) => w.address && (w.chain === "solana" ? isSolana(w.address) : isBitcoin(w.address)));
}

export function isSolana(a: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
}

export function isBitcoin(a: string): boolean {
  return /^(bc1[a-z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/.test(a);
}

export function short(a: string): string {
  return a.length > 12 ? `${a.slice(0, 4)}...${a.slice(-4)}` : a;
}
