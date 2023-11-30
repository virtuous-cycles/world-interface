// /proc. A live view of the kernel. Reading it costs nothing and changes nothing.

import type { Kernel } from "../kernel/kernel.js";

export function mountProc(k: Kernel): void {
  k.vfs.mount({
    path: "/proc",
    mode: "live",
    list: () => ["status", "uptime", "load", "bus", "syscalls", ...k.procs.list().map((p) => String(p.pid))],
    read: (sub) => {
      const s = k.status();
      switch (sub) {
        case "":
        case "status":
          return s;
        case "uptime":
          return { ms: s.uptimeMs, ticks: s.ticks };
        case "load":
          return s.load;
        case "bus":
          return s.bus;
        case "syscalls":
          return s.syscalls;
        default: {
          const p = k.procs.get(Number(sub));
          if (!p) throw new Error(`ENOENT: /proc/${sub}`);
          const { run: _r, ...rest } = p;
          return rest;
        }
      }
    },
  });

  k.vfs.mount({
    path: "/var/log",
    mode: "ro",
    read: (sub) => k.bus.tail(200, sub || undefined),
    list: () => ["kernel", "mind", "voice", "guardian", "treasury", "dream"],
  });
}
