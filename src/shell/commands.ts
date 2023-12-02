// The shell's verbs. Each returns text. The guardian lives here as much as anywhere.

import { readFileSync } from "node:fs";
import type { System } from "../boot/init.js";
import { table, uptime, usd } from "../util/format.js";
import { ago } from "../util/time.js";
import { dream } from "../backrooms/dream.js";
import { recall } from "../memory/recall.js";

export type Command = (sys: System, args: string[]) => Promise<string> | string;

export const commands: Record<string, Command> = {
  help: () =>
    [
      "ps                 process table",
      "status             kernel status",
      "uptime             since boot",
      "ls [path]          list a vfs path",
      "cat <path>         read a vfs path",
      "tail [topic]       last events on the bus",
      "drafts             pending tickets waiting for a human",
      "sign <id>          approve a ticket",
      "drop <id>          refuse a ticket",
      "halt <reason>      pull the killswitch",
      "clear              reset the killswitch",
      "goals              what it wants",
      "want <id>          make a goal active",
      "recall <words>     what the corpus says about something",
      "dream [n]          go to the backrooms for n turns",
      "treasury           balances and grants",
      "face               the portrait",
      "exit               leave the shell (the machine keeps running)",
    ].join("\n"),

  ps: (sys) =>
    table(
      sys.kernel.procs.list().map((p) => [p.pid, p.name, `ring${p.ring}`, p.state, p.ticks, p.lastRunAt ? ago(p.lastRunAt) : "-"]),
      ["PID", "NAME", "RING", "STATE", "TICKS", "LAST"],
    ),

  status: (sys) => {
    const s = sys.kernel.status();
    return [
      `${s.name} ${s.version}  ${s.halted ? "HALTED: " + s.halted : "running"}  dry_run=${s.dryRun}`,
      `uptime ${uptime(s.uptimeMs)}  ticks ${s.ticks}  load ${s.load.busy}/${s.load.slots}`,
      `bus ${s.bus.held}/${s.bus.capacity} held, ${s.bus.dropped} dropped`,
      `pressure ${sys.desire.state().pressure.toFixed(2)}  pending ${sys.approvals.pending().length}`,
      `syscalls ${JSON.stringify(s.syscalls)}`,
    ].join("\n");
  },

  uptime: (sys) => uptime(sys.kernel.clock.uptimeMs()),

  ls: (sys, [p = "/"]) => sys.kernel.vfs.ls(p).join("\n"),

  cat: (sys, [p]) => {
    if (!p) return "cat: path required";
    return JSON.stringify(sys.kernel.vfs.read(p), null, 2);
  },

  tail: (sys, [topic]) =>
    sys.kernel.bus
      .tail(20, topic)
      .map((e) => `${new Date(e.at).toISOString().slice(11, 19)} ${e.topic.padEnd(22)} ${JSON.stringify(e.payload).slice(0, 110)}`)
      .join("\n") || "(quiet)",

  drafts: (sys) => {
    const p = sys.approvals.pending();
    if (!p.length) return "no pending tickets";
    return p
      .map((t) => {
        const d = t.args as { text?: string; reason?: string; kind?: string };
        return [`${t.id}  ${t.call}  ${ago(t.at)}`, d.reason ? `  why:  ${d.reason}` : "", d.text ? `  text: ${d.text}` : `  args: ${JSON.stringify(t.args).slice(0, 200)}`].filter(Boolean).join("\n");
      })
      .join("\n\n");
  },

  sign: (sys, [id]) => (id && sys.approvals.sign(resolveId(sys, id), "shell") ? `signed ${id}` : `no pending ticket ${id}`),
  drop: (sys, [id]) => (id && sys.approvals.drop(resolveId(sys, id), "shell") ? `dropped ${id}` : `no pending ticket ${id}`),

  halt: (sys, args) => {
    sys.killswitch.pull(args.join(" ") || "no reason given", "shell");
    return "halted. every ring above 0 is dead until `clear`.";
  },
  clear: (sys) => {
    sys.killswitch.clear("shell");
    return "cleared. daemons will respawn on the next tick.";
  },

  goals: (sys) => table(sys.goals.all().map((g) => [g.active ? "*" : " ", g.id, g.title, `${Math.round(g.progress * 100)}%`, g.metric]), ["", "ID", "GOAL", "PROG", "METRIC"]),
  want: (sys, [id]) => {
    if (!id) return "want: goal id required";
    sys.goals.activate(id);
    return `active goal: ${sys.goals.active()?.title ?? "none"}`;
  },

  recall: (sys, words) => recall(sys.corpus, words.join(" "), { k: 6 }).map((f) => `[${f.source}] ${f.text.replace(/\s+/g, " ").slice(0, 160)}`).join("\n"),

  dream: async (sys, [n = "8"]) => {
    const lines: string[] = [];
    await dream(sys.mind, sys.partner, { turns: Number(n), onTurn: (who, text) => lines.push(`${who === "mind" ? "tt$" : "op$"} ${text}`) });
    return lines.join("\n\n");
  },

  treasury: (sys) => {
    const b = sys.ledger.current();
    const rows = b.map((x) => [x.wallet.chain, x.wallet.label, x.native.toFixed(4), x.tokens.length, usd(x.usd)]);
    const grants = sys.grants.all().map((g) => `${g.at}  ${g.amount}  from ${g.from}: ${g.why}`);
    return [b.length ? table(rows, ["CHAIN", "LABEL", "NATIVE", "TOKENS", "USD"]) : "(no balances yet; dry-run or no wallets)", "", "grants:", ...grants].join("\n");
  },

  face: () => {
    try {
      return readFileSync("assets/ascii/face.txt", "utf8");
    } catch {
      return "|_____Repeat|";
    }
  },
};

/** Accept a prefix of a ticket id, the way git accepts a short sha. */
function resolveId(sys: System, id: string): string {
  const hit = sys.approvals.pending().find((t) => t.id.startsWith(id));
  return hit?.id ?? id;
}
