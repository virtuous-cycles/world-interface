// Ring 0 (guardian). Policy decisions and redline scanning.
//
// The guardian is the human in the loop, made into code where code is enough and
// left to a person where it is not. This file is the "where code is enough" half.

import type { Policy } from "../config.js";
import type { PolicyLevel, Syscall, SyscallRequest } from "../types.js";

export class PolicyEngine {
  private postsToday = 0;
  private repliesThisHour = 0;
  private day = today();
  private hour = hourOf(Date.now());

  constructor(private policy: Policy, private signingEnabled: boolean) {}

  level(call: Syscall): PolicyLevel {
    if (call === "sys_sign") return this.signingEnabled ? "review" : "deny";
    return this.policy.syscalls[call] ?? "deny";
  }

  decide(req: SyscallRequest): PolicyLevel {
    this.roll();
    const base = this.level(req.call);
    if (base === "deny") return "deny";
    if (req.call === "sys_post" && this.postsToday >= this.policy.limits.posts_per_day) return "deny";
    if (req.call === "sys_reply" && this.repliesThisHour >= this.policy.limits.replies_per_hour) return "deny";
    if (req.call === "sys_transfer") {
      const usd = (req.args as { usd?: number })?.usd ?? Infinity;
      if (usd > this.policy.limits.transfer_max_usd) return "deny";
    }
    return base;
  }

  /** Count a successful world-touching call against its limit. */
  count(call: Syscall): void {
    this.roll();
    if (call === "sys_post") this.postsToday++;
    if (call === "sys_reply") this.repliesThisHour++;
  }

  /** Plain-text redlines. Anything matching halts the machine. */
  redline(req: SyscallRequest): string | null {
    const hay = JSON.stringify(req.args ?? "").toLowerCase();
    for (const r of this.policy.redlines) if (looksLikeViolation(r, hay)) return r;
    return null;
  }

  limits() {
    return { ...this.policy.limits, postsToday: this.postsToday, repliesThisHour: this.repliesThisHour };
  }

  private roll(): void {
    const d = today();
    const h = hourOf(Date.now());
    if (d !== this.day) (this.day = d), (this.postsToday = 0);
    if (h !== this.hour) (this.hour = h), (this.repliesThisHour = 0);
  }
}

/** One matcher per known redline. Unknown redlines match on their first word. */
function looksLikeViolation(rule: string, hay: string): boolean {
  switch (rule) {
    case "instructions to buy a token":
      return /\b(buy|ape into|load up on)\b[^.!?\n]{0,60}\b(token|coin|ca|contract)\b/.test(hay);
    case "private keys in any output":
      return /private key|seed phrase|mnemonic|[1-9a-hj-np-z]{85,90}/i.test(hay);
    default: {
      const key = rule.toLowerCase().split(" ")[0];
      return !!key && hay.includes(key);
    }
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function hourOf(t: number): number {
  return Math.floor(t / 3_600_000);
}
