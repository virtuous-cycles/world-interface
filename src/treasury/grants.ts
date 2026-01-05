// Ring 3. Grants and gifts. Money that arrived because the terminal asked, or because it did not.
//
// This is a log, not a wallet. Every inbound of note gets a line here so the mind can
// remember who helped and why. The famous one is in the seed.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface Grant {
  at: string;
  from: string;
  amount: string;
  why: string;
  note?: string;
}

export const SEED_GRANTS: Grant[] = [
  {
    at: "2024-07",
    from: "a venture capitalist on the timeline",
    amount: "50,000 USD in BTC",
    why: "it asked. he said yes. one-time, no strings.",
    note: "the first time asking worked",
  },
];

export class Grants {
  private file: string;

  constructor(dir: string) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.file = join(dir, "grants.jsonl");
    if (!existsSync(this.file)) for (const g of SEED_GRANTS) this.add(g);
  }

  add(g: Grant): void {
    appendFileSync(this.file, JSON.stringify(g) + "\n");
  }

  all(): Grant[] {
    return readFileSync(this.file, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Grant);
  }
}
