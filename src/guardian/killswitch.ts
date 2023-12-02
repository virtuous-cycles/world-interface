// Ring 0 (guardian). The killswitch. One function, two states, a written reason.
//
// Pulling it halts every process above ring 0 and refuses every syscall until a
// person clears it. It is wired to: redlines, the shell ("halt"), the server
// (POST /guardian/halt) and SIGUSR2 on the host.

import type { Kernel } from "../kernel/kernel.js";

export class Killswitch {
  private pulls: { at: number; reason: string; by: string }[] = [];

  constructor(private kernel: Kernel) {
    process.on("SIGUSR2", () => this.pull("SIGUSR2 from host", "host"));
  }

  pull(reason: string, by = "guardian"): void {
    this.pulls.push({ at: Date.now(), reason, by });
    this.kernel.panic(`${by}: ${reason}`);
  }

  clear(by: string): void {
    this.kernel.bus.emit("guardian.clear", "guardian", { by });
    this.kernel.clear();
  }

  armed(): boolean {
    return !this.kernel.status().halted;
  }

  history() {
    return [...this.pulls];
  }
}
