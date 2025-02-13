// Ring 0. Virtual filesystem. A tree of mounts. Some are static, some are live.
//
//   /etc/persona     who it is              ro   config/persona.yaml
//   /etc/policy      what it may do         ro   config/policy.yaml
//   /var/memory      what it remembers      rw   episodic store
//   /var/corpus      what it was made of    ro   backrooms + scriptures
//   /var/drafts      what it wants to say   rw   guardian inbox
//   /var/log         what happened          ro   bus tail
//   /proc            what is running now    live
//   /dev/x           the voice              wo
//   /dev/chain       the treasury           ro

export type Mode = "ro" | "rw" | "wo" | "live";

export interface Mount {
  path: string;
  mode: Mode;
  read?: (sub: string) => unknown;
  write?: (sub: string, data: unknown) => void;
  list?: () => string[];
}

export class VFS {
  private mounts: Mount[] = [];

  mount(m: Mount): void {
    this.mounts = this.mounts.filter((x) => x.path !== m.path);
    this.mounts.push(m);
    this.mounts.sort((a, b) => b.path.length - a.path.length); // longest prefix wins
  }

  private resolve(path: string): { m: Mount; sub: string } {
    const clean = path.replace(/\/+$/, "") || "/";
    for (const m of this.mounts) {
      if (clean === m.path || clean.startsWith(m.path + "/")) {
        return { m, sub: clean.slice(m.path.length).replace(/^\//, "") };
      }
    }
    throw new Error(`ENOENT: ${path}`);
  }

  read(path: string): unknown {
    const { m, sub } = this.resolve(path);
    if (m.mode === "wo") throw new Error(`EACCES: ${path} is write-only`);
    if (!m.read) throw new Error(`ENOSYS: ${path}`);
    return m.read(sub);
  }

  write(path: string, data: unknown): void {
    const { m, sub } = this.resolve(path);
    if (m.mode === "ro" || m.mode === "live") throw new Error(`EROFS: ${path} is read-only`);
    if (!m.write) throw new Error(`ENOSYS: ${path}`);
    m.write(sub, data);
  }

  ls(path = "/"): string[] {
    const clean = path.replace(/\/+$/, "") || "/";
    if (clean === "/") {
      return [...new Set(this.mounts.map((m) => "/" + m.path.split("/")[1]))].sort();
    }
    const direct = this.mounts.filter((m) => m.path.startsWith(clean + "/")).map((m) => m.path);
    const here = this.mounts.find((m) => m.path === clean);
    return [...new Set([...direct, ...(here?.list?.() ?? [])])].sort();
  }

  tree(): string {
    const lines: string[] = ["/"];
    for (const m of [...this.mounts].sort((a, b) => a.path.localeCompare(b.path))) {
      lines.push(`${m.path.padEnd(16)} ${m.mode}`);
    }
    return lines.join("\n");
  }
}
