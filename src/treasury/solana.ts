// Ring 3. Solana reads. Native balance and token accounts. No signing lives in this file.

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

export interface SolBalance {
  sol: number;
  tokens: { mint: string; amount: number }[];
}

export class Solana {
  private conn: Connection;

  constructor(rpcUrl: string) {
    this.conn = new Connection(rpcUrl, "confirmed");
  }

  async balance(address: string): Promise<SolBalance> {
    const pk = new PublicKey(address);
    const [lamports, accounts] = await Promise.all([
      this.conn.getBalance(pk),
      this.conn.getParsedTokenAccountsByOwner(pk, { programId: TOKEN_PROGRAM }),
    ]);
    const tokens = accounts.value
      .map((a) => {
        const info = a.account.data.parsed.info as { mint: string; tokenAmount: { uiAmount: number | null } };
        return { mint: info.mint, amount: info.tokenAmount.uiAmount ?? 0 };
      })
      .filter((t) => t.amount > 0);
    return { sol: lamports / LAMPORTS_PER_SOL, tokens };
  }

  async recentSignatures(address: string, limit = 10): Promise<string[]> {
    const sigs = await this.conn.getSignaturesForAddress(new PublicKey(address), { limit });
    return sigs.map((s) => s.signature);
  }
}
