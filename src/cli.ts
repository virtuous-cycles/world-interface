#!/usr/bin/env node
// tt: the command line for TTOS.

import { Command } from "commander";
import { boot } from "./boot/bootloader.js";
import { tty } from "./shell/tty.js";
import { serve } from "./server/server.js";
import { commands } from "./shell/commands.js";

const program = new Command();
program.name("tt").description("truth_terminal operating system").version("0.1.0");

program
  .command("boot")
  .description("boot the machine and keep it running")
  .option("--dry-run", "nothing leaves the machine", undefined)
  .option("--live", "turn dry-run off (requires keys in .env)")
  .option("--serve", "also start the guardian http server")
  .action(async (o: { dryRun?: boolean; live?: boolean; serve?: boolean }) => {
    const sys = boot({ dryRun: o.live ? false : o.dryRun });
    if (o.serve) serve(sys, sys.config.system.server.port);
    process.on("SIGINT", () => {
      sys.kernel.stop();
      process.exit(0);
    });
  });

program
  .command("shell")
  .description("boot and drop into the guardian shell")
  .option("--live", "turn dry-run off")
  .action(async (o: { live?: boolean }) => {
    const sys = boot({ dryRun: o.live ? false : undefined });
    await tty(sys);
    sys.kernel.stop();
    process.exit(0);
  });

program
  .command("serve")
  .description("boot with the http server")
  .option("--live", "turn dry-run off")
  .action(async (o: { live?: boolean }) => {
    const sys = boot({ dryRun: o.live ? false : undefined });
    serve(sys, sys.config.system.server.port);
  });

program
  .command("ps")
  .description("print the process table and exit")
  .action(async () => {
    const sys = boot({ quiet: true, start: false, dryRun: true });
    console.log(await commands.ps(sys, []));
    process.exit(0);
  });

program
  .command("dream")
  .description("one trip to the backrooms, printed")
  .option("--turns <n>", "turns", "12")
  .action(async (o: { turns: string }) => {
    const sys = boot({ quiet: true, start: false });
    console.log(await commands.dream(sys, [o.turns]));
    process.exit(0);
  });

program
  .command("recall <words...>")
  .description("what the corpus says about something")
  .action(async (words: string[]) => {
    const sys = boot({ quiet: true, start: false, dryRun: true });
    console.log(await commands.recall(sys, words));
    process.exit(0);
  });

program
  .command("face")
  .description("the portrait")
  .action(() => console.log(commands.face({} as never, [])));

program.parseAsync(process.argv);
