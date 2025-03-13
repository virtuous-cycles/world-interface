// Ring 0 (guardian). The audit trail. Append-only. Every decision about the world is a line.

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Bus } from "../kernel/bus.js";

const TOPICS = ["voice.*", "guardian.*", "kernel.panic", "kernel.clear", "treasury.*"];

export function startAudit(bus: Bus, dir: string): () => void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const file = join(dir, "audit.jsonl");
  const offs = TOPICS.map((t) =>
    bus.on(t, (ev) => {
      appendFileSync(file, JSON.stringify({ at: ev.at, topic: ev.topic, source: ev.source, payload: ev.payload }) + "\n");
    }),
  );
  return () => offs.forEach((off) => off());
}
