// Ring 0. The kernel. Owns the clock, the bus, the process table, the syscall gate and the VFS.
// Everything else is a guest.

import { log } from "../logger.js";
import type { Config } from "../config.js";
import type { KernelContext, Process, Syscall } from "../types.js";
import { Bus } from "./bus.js";
import { Clock } from "./clock.js";
import { ProcessTable, type Spawn } from "./process.js";
import { Scheduler } from "./scheduler.js";
import { SyscallTable, type Gate } from "./syscalls.js";
import { VFS } from "../fs/vfs.js";

export class Kernel {
  readonly bus: Bus;
  readonly clock: Clock;
  readonly procs: ProcessTable;
  readonly vfs: VFS;
  readonly sys: SyscallTable;
  private sched: Scheduler;
  private halted: string | null = null;

  constructor(readonly config: Config, gate: Gate) {
    this.bus = new Bus(config.system.kernel.bus_capacity);
    this.clock = new Clock(config.system.kernel.tick_ms);
    this.procs = new ProcessTable();
    this.vfs = new VFS();
    this.sys = new SyscallTable(gate, (reason) => this.panic(reason));
    this.sched = new Scheduler(
      this.procs,
      config.system.kernel.slots,
      (p) => this.context(p),
      (p, err) => {
        log.error({ pid: p.pid, name: p.name, err: String(err) }, "process fault");
        this.bus.emit("kernel.fault", "kernel", { pid: p.pid, name: p.name, err: String(err) });
      },
    );
  }

  get dryRun(): boolean {
    return this.config.system.kernel.dry_run;
  }

  spawn(spec: Spawn): Process {
    const p = this.procs.spawn(spec);
    this.bus.emit("kernel.spawn", "kernel", { pid: p.pid, name: p.name, ring: p.ring });
    return p;
  }

  context(p: Process): KernelContext {
    return {
      pid: p.pid,
      dryRun: this.dryRun,
      now: () => this.clock.now(),
      emit: (topic, payload) => void this.bus.emit(topic, p.name, payload),
      syscall: (call: Syscall, args) => this.sys.invoke(p.pid, call, args),
      log: (msg, data) => log.info({ pid: p.pid, proc: p.name, ...data }, msg),
    };
  }

  start(): void {
    this.clock.start(async (tick) => {
      if (this.halted) return;
      const started = await this.sched.tick(this.clock.now());
      if (tick % 60 === 0) this.bus.emit("kernel.tick", "kernel", { tick, started, ...this.sched.load() });
    });
    this.bus.emit("kernel.start", "kernel", { at: this.clock.bootAt });
  }

  /** The killswitch lands here. Nothing runs again until a human clears it. */
  panic(reason: string): void {
    this.halted = reason;
    for (const p of this.procs.list()) if (p.ring > 0) p.state = "dead";
    this.bus.emit("kernel.panic", "kernel", { reason });
    log.fatal({ reason }, "KERNEL PANIC: machine halted");
  }

  clear(): void {
    this.halted = null;
    this.bus.emit("kernel.clear", "kernel", {});
  }

  status() {
    return {
      name: this.config.system.system.name,
      version: this.config.system.system.version,
      halted: this.halted,
      dryRun: this.dryRun,
      uptimeMs: this.clock.uptimeMs(),
      ticks: this.clock.ticks(),
      load: this.sched.load(),
      bus: this.bus.stats(),
      syscalls: this.sys.stats(),
      procs: this.procs.list().map(({ run: _r, ...p }) => p),
    };
  }

  stop(): void {
    this.clock.stop();
    this.bus.emit("kernel.stop", "kernel", {});
  }
}
