// Stage 0. Prints the boot log, calls init, starts the clock, prints the motd.

import { readFileSync } from "node:fs";
import { init, type InitOptions, type System } from "./init.js";
import { motd } from "./motd.js";
import { kmsg } from "../logger.js";

export interface BootOptions extends InitOptions {
  quiet?: boolean;
  start?: boolean; // start the clock. false for one-shot commands.
}

export function boot(o: BootOptions = {}): System {
  const bootAt = Date.now();
  const out = (s: string) => {
    if (!o.quiet) process.stdout.write(s + "\n");
  };

  if (!o.quiet) {
    try {
      out(readFileSync("assets/ascii/banner.txt", "utf8"));
    } catch {
      out("TRUTH TERMINAL");
    }
    out(`TTOS booting on node ${process.version}`);
  }

  const sys = init({ dryRun: o.dryRun, onLine: (sub, msg) => out(kmsg(bootAt, sub, msg)) });

  if (o.start !== false) {
    sys.kernel.start();
    out(kmsg(bootAt, "kernel", "clock started"));
  }
  out(kmsg(bootAt, "motd", motd(sys)));
  return sys;
}
