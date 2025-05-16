// Ring 0. The process table. Daemons, dreams and shells are all processes.

import type { Process, ProcessState, Ring, KernelContext } from "../types.js";

export interface Spawn {
  name: string;
  ring: Ring;
  every?: number;
  run: (ctx: KernelContext) => Promise<void>;
}

export class ProcessTable {
  private procs = new Map<number, Process>();
  private nextPid = 1;

  spawn(spec: Spawn): Process {
    const p: Process = {
      pid: this.nextPid++,
      name: spec.name,
      ring: spec.ring,
      state: "new",
      startedAt: Date.now(),
      ticks: 0,
      every: spec.every,
      run: spec.run,
    };
    this.procs.set(p.pid, p);
    p.state = "ready";
    return p;
  }

  get(pid: number): Process | undefined {
    return this.procs.get(pid);
  }

  byName(name: string): Process | undefined {
    for (const p of this.procs.values()) if (p.name === name) return p;
    return undefined;
  }

  list(): Process[] {
    return [...this.procs.values()].sort((a, b) => a.pid - b.pid);
  }

  set(pid: number, state: ProcessState): void {
    const p = this.procs.get(pid);
    if (p) p.state = state;
  }

  kill(pid: number): boolean {
    const p = this.procs.get(pid);
    if (!p || p.ring === 0) return false; // ring 0 is unkillable from userland
    p.state = "dead";
    return true;
  }

  /** Processes due to run on this tick. */
  due(now: number): Process[] {
    return this.list().filter((p) => {
      if (p.state === "dead" || p.state === "running") return false;
      if (!p.every) return p.state === "ready";
      return !p.lastRunAt || now - p.lastRunAt >= p.every;
    });
  }
}
