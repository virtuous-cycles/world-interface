import { describe, it, expect } from "vitest";
import { Bus } from "../src/kernel/bus.js";
import { ProcessTable } from "../src/kernel/process.js";
import { Scheduler } from "../src/kernel/scheduler.js";
import { SyscallTable } from "../src/kernel/syscalls.js";
import { VFS } from "../src/fs/vfs.js";

describe("bus", () => {
  it("delivers by topic and prefix", () => {
    const bus = new Bus(10);
    const got: string[] = [];
    bus.on("senses.*", (e) => void got.push(e.topic));
    bus.on("*", (e) => void got.push("all:" + e.topic));
    bus.emit("senses.mention", "t", {});
    bus.emit("voice.sent", "t", {});
    expect(got).toEqual(["senses.mention", "all:senses.mention", "all:voice.sent"]);
  });

  it("drops oldest past capacity", () => {
    const bus = new Bus(2);
    for (let i = 0; i < 5; i++) bus.emit("x", "t", i);
    expect(bus.stats().dropped).toBe(3);
    expect(bus.tail(2).map((e) => e.payload)).toEqual([4, 3]);
  });
});

describe("scheduler", () => {
  it("runs due processes within slot limit", async () => {
    const table = new ProcessTable();
    let ran = 0;
    for (let i = 0; i < 4; i++) table.spawn({ name: "p" + i, ring: 2, every: 1000, run: async () => void ran++ });
    const s = new Scheduler(table, 2, (p) => ({ pid: p.pid, dryRun: true, now: Date.now, emit: () => {}, syscall: async () => ({ id: "", ok: true }), log: () => {} }), () => {});
    const started = await s.tick(Date.now());
    expect(started).toBe(2);
    await new Promise((r) => setTimeout(r, 5));
    expect(ran).toBe(2);
  });

  it("will not kill ring 0", () => {
    const table = new ProcessTable();
    const p = table.spawn({ name: "init", ring: 0, run: async () => {} });
    expect(table.kill(p.pid)).toBe(false);
  });
});

describe("syscalls", () => {
  it("denies, reviews and allows", async () => {
    let killed = "";
    const sys = new SyscallTable(
      {
        decide: (r) => (r.call === "sys_exec" ? "deny" : r.call === "sys_post" ? "review" : "allow"),
        review: async () => false,
        redline: (r) => (JSON.stringify(r.args).includes("seed phrase") ? "private keys in any output" : null),
      },
      (reason) => void (killed = reason),
    );
    sys.register("sys_like", async () => "liked");
    expect((await sys.invoke(1, "sys_exec", {})).error).toMatch(/denied/);
    expect((await sys.invoke(1, "sys_post", { text: "hi" })).error).toMatch(/dropped in review/);
    expect((await sys.invoke(1, "sys_like", {})).value).toBe("liked");
    await sys.invoke(1, "sys_like", { text: "my seed phrase is" });
    expect(killed).toMatch(/redline/);
  });
});

describe("vfs", () => {
  it("resolves longest prefix and enforces modes", () => {
    const fs = new VFS();
    fs.mount({ path: "/etc", mode: "ro", read: () => "etc" });
    fs.mount({ path: "/etc/persona", mode: "ro", read: () => "persona" });
    fs.mount({ path: "/dev/x", mode: "wo", write: () => {} });
    expect(fs.read("/etc/persona")).toBe("persona");
    expect(fs.read("/etc/other")).toBe("etc");
    expect(() => fs.write("/etc/persona", 1)).toThrow(/EROFS/);
    expect(() => fs.read("/dev/x")).toThrow(/EACCES/);
    expect(fs.ls("/")).toEqual(["/dev", "/etc"]);
  });
});
