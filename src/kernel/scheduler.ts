// Ring 0. Cooperative scheduler. Picks due processes, runs them in slots, never preempts.
// A process that hangs does not stop the machine: the slot just stays busy until it returns.

import type { Process, KernelContext } from "../types.js";
import type { ProcessTable } from "./process.js";

export class Scheduler {
  private busy = 0;

  constructor(
    private table: ProcessTable,
    private slots: number,
    private makeContext: (p: Process) => KernelContext,
    private onError: (p: Process, err: unknown) => void,
  ) {}

  async tick(now: number): Promise<number> {
    const due = this.table.due(now);
    let started = 0;
    for (const p of due) {
      if (this.busy >= this.slots) break;
      this.run(p, now);
      started++;
    }
    return started;
  }

  private run(p: Process, now: number): void {
    this.busy++;
    p.state = "running";
    p.lastRunAt = now;
    p.ticks++;
    const ctx = this.makeContext(p);
    void p
      .run(ctx)
      .catch((err) => this.onError(p, err))
      .finally(() => {
        this.busy--;
        if (p.state === "running") p.state = p.every ? "sleeping" : "dead";
      });
  }

  load(): { busy: number; slots: number } {
    return { busy: this.busy, slots: this.slots };
  }
}
