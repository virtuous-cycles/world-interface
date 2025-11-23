// A small HTTP face for the guardian. Read endpoints are open on localhost.
// Write endpoints need the guardian password. Nothing here can make the terminal speak.

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { System } from "../boot/init.js";

export function serve(sys: System, port: number): void {
  const password = process.env.TT_GUARDIAN_PASSWORD ?? "change-me";

  const json = (res: ServerResponse, code: number, body: unknown) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body, null, 2));
  };

  const authed = (req: IncomingMessage) => req.headers["x-guardian"] === password;

  const srv = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const p = url.pathname;

    if (req.method === "GET") {
      if (p === "/" || p === "/status") return json(res, 200, sys.kernel.status());
      if (p === "/proc") return json(res, 200, sys.kernel.vfs.read("/proc"));
      if (p === "/drafts") return json(res, 200, sys.approvals.pending());
      if (p === "/tickets") return json(res, 200, sys.approvals.all());
      if (p === "/log") return json(res, 200, sys.kernel.bus.tail(100, url.searchParams.get("topic") ?? undefined));
      if (p === "/goals") return json(res, 200, sys.goals.all());
      if (p === "/treasury") return json(res, 200, { balances: sys.ledger.current(), grants: sys.grants.all() });
      if (p.startsWith("/fs/")) {
        try {
          return json(res, 200, sys.kernel.vfs.read(p.slice(3)));
        } catch (err) {
          return json(res, 404, { error: String(err) });
        }
      }
    }

    if (req.method === "POST") {
      if (!authed(req)) return json(res, 401, { error: "x-guardian header required" });
      const m = /^\/guardian\/(sign|drop)\/([0-9a-f-]+)$/.exec(p);
      if (m) {
        const ok = m[1] === "sign" ? sys.approvals.sign(m[2], "http") : sys.approvals.drop(m[2], "http");
        return json(res, ok ? 200 : 404, { ok, id: m[2], action: m[1] });
      }
      if (p === "/guardian/halt") {
        sys.killswitch.pull(url.searchParams.get("reason") ?? "http", "http");
        return json(res, 200, { halted: true });
      }
      if (p === "/guardian/clear") {
        sys.killswitch.clear("http");
        return json(res, 200, { halted: false });
      }
    }
    json(res, 404, { error: "not found" });
  });

  srv.listen(port, sys.config.system.server.public ? "0.0.0.0" : "127.0.0.1", () => {
    sys.kernel.bus.emit("server.listen", "server", { port });
  });
}
