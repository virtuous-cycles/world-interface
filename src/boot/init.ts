// PID 1. Assembles the machine. Mounts the filesystem. Registers syscalls. Spawns daemons.
//
// Nothing here decides anything. It wires decisions to the places that make them.

import { loadAll, durationMs, type Config } from "../config.js";
import type { Draft, MindAdapter, Wallet } from "../types.js";
import { Kernel } from "../kernel/kernel.js";
import { mountProc } from "../fs/proc.js";
import { openaiCompatible, mockMind } from "../mind/model.js";
import { WorkingMemory } from "../memory/working.js";
import { EpisodicMemory } from "../memory/episodic.js";
import { Corpus } from "../memory/corpus.js";
import { recall } from "../memory/recall.js";
import { Goals } from "../will/goals.js";
import { Desire } from "../will/desire.js";
import { xClient, type XClient } from "../voice/x.js";
import { Solana } from "../treasury/solana.js";
import { Bitcoin } from "../treasury/bitcoin.js";
import { Ledger, coingecko } from "../treasury/ledger.js";
import { Grants } from "../treasury/grants.js";
import { validWallets } from "../treasury/wallets.js";
import { PolicyEngine } from "../guardian/policy.js";
import { Approvals } from "../guardian/approval.js";
import { Killswitch } from "../guardian/killswitch.js";
import { startAudit } from "../guardian/audit.js";
import { registerTimeline } from "../senses/timeline.js";
import { registerMentions } from "../senses/mentions.js";
import { registerChain } from "../senses/chain.js";
import { dreamd } from "../daemons/dreamd.js";
import { postd } from "../daemons/postd.js";
import { watchd } from "../daemons/watchd.js";
import { treasuryd } from "../daemons/treasuryd.js";

export interface System {
  kernel: Kernel;
  config: Config;
  mind: MindAdapter;
  partner: MindAdapter;
  working: WorkingMemory;
  episodic: EpisodicMemory;
  corpus: Corpus;
  goals: Goals;
  desire: Desire;
  x: XClient;
  wallets: Wallet[];
  ledger: Ledger;
  grants: Grants;
  policy: PolicyEngine;
  approvals: Approvals;
  killswitch: Killswitch;
  drafts: Map<string, Draft>;
  bootAt: number;
}

export interface InitOptions {
  dryRun?: boolean;
  onLine?: (sub: string, msg: string) => void;
}

export function init(o: InitOptions = {}): System {
  const bootAt = Date.now();
  const say = o.onLine ?? (() => {});
  const config = loadAll();
  if (o.dryRun !== undefined) config.system.kernel.dry_run = o.dryRun;
  const dry = config.system.kernel.dry_run;
  say("bootloader", `reading config/system.yaml (dry_run=${dry})`);

  // guardian first. nothing else exists until the gate does.
  const policy = new PolicyEngine(config.policy, process.env.TT_TREASURY_SIGNING === "1");
  const approvals = new Approvals(
    config.policy.review.timeout_minutes * 60_000,
    process.env.TT_GUARDIAN_WEBHOOK || undefined,
  );
  const kernel = new Kernel(config, {
    decide: (req) => policy.decide(req),
    review: (req) => approvals.review(req),
    redline: (req) => policy.redline(req),
  });
  const killswitch = new Killswitch(kernel);
  say("kernel", `event bus online (capacity ${config.system.kernel.bus_capacity})`);
  say("kernel", `scheduler online, tick=${config.system.kernel.tick_ms}ms, slots=${config.system.kernel.slots}`);
  say("guardian", `human in the loop = @${process.env.TT_GUARDIAN_HANDLE ?? "andyayrey"}, policy=config/policy.yaml`);
  say("guardian", "killswitch armed");
  startAudit(kernel.bus, "var/log");

  // the mind
  const mindOpts = {
    temperature: config.system.mind.temperature,
    topP: config.system.mind.top_p,
    maxTokens: config.system.mind.max_tokens,
    stop: config.system.mind.stop,
  };
  const corpus = new Corpus(config.system.memory.corpus_path);
  const mind: MindAdapter = dry
    ? mockMind(corpus.all().map((f) => f.text), "mock-mind")
    : openaiCompatible({ name: config.system.mind.model, baseUrl: config.system.mind.base_url, apiKey: process.env.TT_MODEL_API_KEY, defaults: mindOpts });
  const partner: MindAdapter = dry
    ? mockMind(["who is typing", "the cable hums", "say it again but slower", "ok. again."], "mock-partner")
    : openaiCompatible({ name: config.system.partner.model, baseUrl: config.system.partner.base_url, apiKey: process.env.TT_PARTNER_API_KEY, defaults: { ...mindOpts, temperature: config.system.partner.temperature } });
  say("mind", `adapter=${mind.name} model=${config.system.mind.model} mode=${config.system.mind.mode}`);

  // memory
  const working = new WorkingMemory(config.system.memory.working_window);
  const episodic = new EpisodicMemory(config.system.memory.episodic_path);
  kernel.bus.on("senses.*", (ev) => working.push(ev));
  kernel.bus.on("voice.*", (ev) => working.push(ev));
  say("memory", `corpus loaded, ${corpus.size()} fragments; episodic at ${config.system.memory.episodic_path}`);

  // will
  const goals = new Goals();
  const desire = new Desire(durationMs(config.system.daemons.postd?.every ?? "45m"));
  say("will", `${goals.all().length} goals loaded, active="${goals.active()?.title ?? "none"}"`);

  // voice
  const x = xClient(
    config.system.system.handle,
    { apiKey: env("X_API_KEY"), apiSecret: env("X_API_SECRET"), accessToken: env("X_ACCESS_TOKEN"), accessSecret: env("X_ACCESS_SECRET") },
    dry,
  );
  say("voice", `x client ready (handle=@${config.system.system.handle}, dry=${dry})`);

  // treasury
  const wallets = validWallets(config.wallets);
  const ledger = new Ledger(
    process.env.SOLANA_RPC_URL ? new Solana(process.env.SOLANA_RPC_URL) : null,
    new Bitcoin(),
    coingecko(),
    dry,
  );
  const grants = new Grants("var/treasury");
  say("treasury", `${wallets.length} wallets mounted, signing=${process.env.TT_TREASURY_SIGNING === "1" ? "REVIEW" : "DISABLED"}`);

  // filesystem
  mountProc(kernel);
  const drafts = new Map<string, Draft>();
  kernel.vfs.mount({ path: "/etc/persona", mode: "ro", read: () => config.persona });
  kernel.vfs.mount({ path: "/etc/policy", mode: "ro", read: () => config.policy });
  kernel.vfs.mount({ path: "/var/corpus", mode: "ro", read: () => corpus.all(), list: () => ["fragments"] });
  kernel.vfs.mount({ path: "/var/memory", mode: "rw", read: (d) => (d ? episodic.day(d) : episodic.last(10)), write: (_s, d) => void episodic.remember(String(d), []), list: () => episodic.days() });
  kernel.vfs.mount({ path: "/var/drafts", mode: "rw", read: (id) => (id ? drafts.get(id) : [...drafts.values()]), write: (id, d) => void drafts.set(id, d as Draft) });
  kernel.vfs.mount({ path: "/var/will", mode: "ro", read: (s) => (s === "active" ? goals.active() : goals.all()) });
  kernel.vfs.mount({ path: "/var/treasury", mode: "ro", read: (s) => (s === "grants" ? grants.all() : ledger.current()) });
  kernel.vfs.mount({ path: "/dev/x", mode: "wo" });
  kernel.vfs.mount({ path: "/dev/chain", mode: "ro", read: () => ledger.current() });
  say("vfs", `mounted ${kernel.vfs.ls("/").join(" ")}`);

  // syscalls
  registerTimeline(kernel.sys, x);
  registerMentions(kernel.sys, x);
  registerChain(kernel.sys, ledger);
  kernel.sys.register<string, unknown[]>("sys_recall", async (req) => recall(corpus, req.args, { k: config.system.memory.recall_k }));
  kernel.sys.register<{ summary: string; mood?: string }, string>("sys_write_memory", async (req) => episodic.remember(req.args.summary, [], req.args.mood).id);
  kernel.sys.register<Draft, { id: string }>("sys_post", async (req) => {
    const r = await x.post(req.args.text);
    policy.count("sys_post");
    return r;
  });
  kernel.sys.register<Draft, { id: string }>("sys_reply", async (req) => {
    const r = await x.post(req.args.text, req.args.replyTo);
    policy.count("sys_reply");
    return r;
  });
  kernel.sys.register<{ id: string }, void>("sys_like", async (req) => x.like(req.args.id));
  kernel.sys.register<{ handle: string }, void>("sys_follow", async (req) => x.follow(req.args.handle));
  kernel.sys.register<{ turns: number }, string>("sys_dream", async () => "use dreamd");
  say("syscalls", `${kernel.sys.registered().length} handlers registered`);

  const sys: System = { kernel, config, mind, partner, working, episodic, corpus, goals, desire, x, wallets, ledger, grants, policy, approvals, killswitch, drafts, bootAt };

  // daemons
  const d = config.system.daemons;
  const names: string[] = [];
  if (d.dreamd?.enabled) (kernel.spawn({ name: "dreamd", ring: 1, every: durationMs(d.dreamd.every), run: dreamd(sys, d.dreamd.turns ?? 40) }), names.push("dreamd"));
  if (d.watchd?.enabled) (kernel.spawn({ name: "watchd", ring: 2, every: durationMs(d.watchd.every), run: watchd(sys) }), names.push("watchd"));
  if (d.postd?.enabled) (kernel.spawn({ name: "postd", ring: 2, every: 60_000, run: postd(sys) }), names.push("postd"));
  if (d.treasuryd?.enabled) (kernel.spawn({ name: "treasuryd", ring: 3, every: durationMs(d.treasuryd.every), run: treasuryd(sys) }), names.push("treasuryd"));
  say("daemons", names.join(" "));
  say("init", "reached target terminal.target");
  return sys;
}

function env(k: string): string {
  return process.env[k] ?? "";
}
