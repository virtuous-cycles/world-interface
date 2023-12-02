// Ring 0 (guardian). The approval inbox. Where a person reads what the terminal wants to say.
//
// Every review-level syscall becomes a Ticket. Tickets live in /var/drafts. A human
// signs or drops them through the shell, the HTTP server or a webhook callback. An
// unsigned ticket expires to "drop". There is no path that resolves to "approve"
// without a person.

import type { SyscallRequest } from "../types.js";
import { postJson } from "../util/http.js";

export interface Ticket {
  id: string;
  call: string;
  pid: number;
  at: number;
  args: unknown;
  status: "pending" | "signed" | "dropped" | "expired";
  by?: string;
  decidedAt?: number;
}

export class Approvals {
  private tickets = new Map<string, Ticket>();
  private waiters = new Map<string, (ok: boolean) => void>();

  constructor(
    private timeoutMs: number,
    private webhook?: string,
    private onTicket?: (t: Ticket) => void,
  ) {}

  /** Park a request. Resolves when a human decides or the clock runs out. */
  review(req: SyscallRequest): Promise<boolean> {
    const t: Ticket = { id: req.id, call: req.call, pid: req.pid, at: req.at, args: req.args, status: "pending" };
    this.tickets.set(t.id, t);
    this.onTicket?.(t);
    if (this.webhook) void postJson(this.webhook, { ticket: t }).catch(() => {});
    return new Promise<boolean>((resolve) => {
      this.waiters.set(t.id, resolve);
      setTimeout(() => {
        if (t.status === "pending") this.decide(t.id, false, "clock", "expired");
      }, this.timeoutMs).unref();
    });
  }

  sign(id: string, by: string): boolean {
    return this.decide(id, true, by, "signed");
  }

  drop(id: string, by: string): boolean {
    return this.decide(id, false, by, "dropped");
  }

  private decide(id: string, ok: boolean, by: string, status: Ticket["status"]): boolean {
    const t = this.tickets.get(id);
    if (!t || t.status !== "pending") return false;
    t.status = status;
    t.by = by;
    t.decidedAt = Date.now();
    this.waiters.get(id)?.(ok);
    this.waiters.delete(id);
    return true;
  }

  pending(): Ticket[] {
    return [...this.tickets.values()].filter((t) => t.status === "pending").sort((a, b) => a.at - b.at);
  }

  all(n = 50): Ticket[] {
    return [...this.tickets.values()].sort((a, b) => b.at - a.at).slice(0, n);
  }

  get(id: string): Ticket | undefined {
    return this.tickets.get(id);
  }
}
