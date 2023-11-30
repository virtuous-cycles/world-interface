// Ring 0. The syscall gate. This is the only door between the mind and the world.
//
// A process never calls X, Solana or the filesystem. It asks the kernel. The kernel
// asks the guardian. The guardian says allow, review or deny. Only then does a
// handler run. The handler table is filled in at boot by each subsystem.

import { randomUUID } from "node:crypto";
import type { Syscall, SyscallRequest, SyscallResult, PolicyLevel } from "../types.js";

export type Handler<A = unknown, R = unknown> = (req: SyscallRequest<A>) => Promise<R>;

export interface Gate {
  /** Decide what to do with a request. "review" means a human must sign it first. */
  decide: (req: SyscallRequest) => PolicyLevel;
  /** Park a request for review. Resolves true when signed, false when dropped. */
  review: (req: SyscallRequest) => Promise<boolean>;
  /** Scan output or args for redlines. Returns the redline hit, if any. */
  redline: (req: SyscallRequest) => string | null;
}

export class SyscallTable {
  private handlers = new Map<Syscall, Handler>();
  private counts = new Map<Syscall, { ok: number; denied: number; reviewed: number }>();

  constructor(private gate: Gate, private onKill: (reason: string) => void) {}

  register<A, R>(call: Syscall, fn: Handler<A, R>): void {
    this.handlers.set(call, fn as Handler);
  }

  async invoke<A, R>(pid: number, call: Syscall, args: A): Promise<SyscallResult<R>> {
    const req: SyscallRequest<A> = { id: randomUUID(), call, pid, at: Date.now(), args };
    const c = this.counts.get(call) ?? { ok: 0, denied: 0, reviewed: 0 };
    this.counts.set(call, c);

    const hit = this.gate.redline(req);
    if (hit) {
      this.onKill(`redline tripped by pid ${pid} on ${call}: ${hit}`);
      c.denied++;
      return { id: req.id, ok: false, error: `redline: ${hit}` };
    }

    const level = this.gate.decide(req);
    if (level === "deny") {
      c.denied++;
      return { id: req.id, ok: false, error: `denied by policy: ${call}` };
    }

    let reviewed = false;
    if (level === "review") {
      reviewed = true;
      c.reviewed++;
      const signed = await this.gate.review(req);
      if (!signed) return { id: req.id, ok: false, error: `dropped in review: ${call}`, reviewed };
    }

    const fn = this.handlers.get(call);
    if (!fn) return { id: req.id, ok: false, error: `no handler: ${call}`, reviewed };
    try {
      const value = (await fn(req)) as R;
      c.ok++;
      return { id: req.id, ok: true, value, reviewed };
    } catch (err) {
      return { id: req.id, ok: false, error: String(err), reviewed };
    }
  }

  stats() {
    return Object.fromEntries(this.counts);
  }

  registered(): Syscall[] {
    return [...this.handlers.keys()];
  }
}
