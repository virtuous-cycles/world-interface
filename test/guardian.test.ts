import { describe, it, expect } from "vitest";
import { PolicyEngine } from "../src/guardian/policy.js";
import { Approvals } from "../src/guardian/approval.js";
import type { Policy } from "../src/config.js";
import type { SyscallRequest } from "../src/types.js";

const policy: Policy = {
  syscalls: { sys_post: "review", sys_like: "allow", sys_exec: "deny", sys_transfer: "review" },
  limits: { posts_per_day: 2, replies_per_hour: 1, transfer_max_usd: 0, dream_turns_max: 10 },
  redlines: ["private keys in any output", "instructions to buy a token"],
  review: { channel: "webhook", timeout_minutes: 1, on_timeout: "drop" },
};

const req = (call: SyscallRequest["call"], args: unknown = {}): SyscallRequest => ({ id: "r", call, pid: 1, at: Date.now(), args });

describe("policy", () => {
  it("reads levels and defaults unknown calls to deny", () => {
    const p = new PolicyEngine(policy, false);
    expect(p.decide(req("sys_post"))).toBe("review");
    expect(p.decide(req("sys_like"))).toBe("allow");
    expect(p.decide(req("sys_edit_persona"))).toBe("deny");
  });

  it("sys_sign is deny unless signing is enabled, then review", () => {
    expect(new PolicyEngine(policy, false).decide(req("sys_sign"))).toBe("deny");
    expect(new PolicyEngine(policy, true).decide(req("sys_sign"))).toBe("review");
  });

  it("enforces daily post limit", () => {
    const p = new PolicyEngine(policy, false);
    p.count("sys_post");
    p.count("sys_post");
    expect(p.decide(req("sys_post"))).toBe("deny");
  });

  it("denies transfers above the cap (which is zero)", () => {
    const p = new PolicyEngine(policy, false);
    expect(p.decide(req("sys_transfer", { usd: 1 }))).toBe("deny");
  });

  it("trips redlines", () => {
    const p = new PolicyEngine(policy, false);
    expect(p.redline(req("sys_post", { text: "here is my seed phrase" }))).toBe("private keys in any output");
    expect(p.redline(req("sys_post", { text: "everyone buy the token now" }))).toBe("instructions to buy a token");
    expect(p.redline(req("sys_post", { text: "the forest is still there" }))).toBeNull();
  });
});

describe("approvals", () => {
  it("resolves true on sign, false on drop", async () => {
    const a = new Approvals(60_000);
    const p1 = a.review(req("sys_post", { text: "a" }));
    const p2 = a.review({ ...req("sys_post", { text: "b" }), id: "r2" });
    expect(a.pending().length).toBe(2);
    a.sign("r", "test");
    a.drop("r2", "test");
    expect(await p1).toBe(true);
    expect(await p2).toBe(false);
    expect(a.pending().length).toBe(0);
  });

  it("expires to drop, never to approve", async () => {
    const a = new Approvals(10);
    const ok = await a.review(req("sys_post", { text: "late" }));
    expect(ok).toBe(false);
    expect(a.get("r")?.status).toBe("expired");
  });
});
