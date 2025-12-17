// The TTY. A line-based shell on the running machine. This is where the guardian sits.

import { createInterface } from "node:readline";
import type { System } from "../boot/init.js";
import { commands } from "./commands.js";

export function tty(sys: System): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: "tt$ " });
  process.stdout.write("truth_terminal shell. type help.\n");

  // the guardian is told the moment something wants out
  sys.kernel.bus.on("voice.draft", (ev) => {
    const d = ev.payload as { id: string; text: string; reason: string };
    process.stdout.write(`\n[ticket] ${d.id.slice(0, 8)}  ${d.reason}\n> ${d.text}\n   sign ${d.id.slice(0, 8)}  |  drop ${d.id.slice(0, 8)}\ntt$ `);
  });
  sys.kernel.bus.on("kernel.panic", (ev) => {
    process.stdout.write(`\n[PANIC] ${(ev.payload as { reason: string }).reason}\ntt$ `);
  });

  rl.prompt();
  return new Promise((resolve) => {
    rl.on("line", async (line) => {
      const [cmd, ...args] = line.trim().split(/\s+/);
      if (!cmd) return rl.prompt();
      if (cmd === "exit" || cmd === "quit") return rl.close();
      const fn = commands[cmd];
      if (!fn) {
        process.stdout.write(`unknown: ${cmd}. try help.\n`);
        return rl.prompt();
      }
      try {
        process.stdout.write((await fn(sys, args)) + "\n");
      } catch (err) {
        process.stdout.write(`error: ${String(err)}\n`);
      }
      rl.prompt();
    });
    rl.on("close", () => resolve());
  });
}
