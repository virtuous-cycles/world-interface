// Ring 3. Bitcoin reads. A public explorer API, address balance only.

import { getJson } from "../util/http.js";

export class Bitcoin {
  constructor(private base = "https://mempool.space/api") {}

  async balance(address: string): Promise<number> {
    const r = await getJson<{ chain_stats: { funded_txo_sum: number; spent_txo_sum: number } }>(`${this.base}/address/${address}`);
    return (r.chain_stats.funded_txo_sum - r.chain_stats.spent_txo_sum) / 1e8;
  }
}
