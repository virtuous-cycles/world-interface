// Ring 0. The event bus. Every subsystem talks through here; none talk to each other directly.

import { randomUUID } from "node:crypto";
import type { KernelEvent } from "../types.js";

type Handler<T = unknown> = (ev: KernelEvent<T>) => void | Promise<void>;

export class Bus {
  private handlers = new Map<string, Set<Handler>>();
  private ring: KernelEvent[] = [];
  private dropped = 0;

  constructor(private capacity: number) {}

  /** Subscribe to a topic. "*" receives everything. Topics may end in ".*" for prefixes. */
  on<T = unknown>(topic: string, fn: Handler<T>): () => void {
    const set = this.handlers.get(topic) ?? new Set();
    set.add(fn as Handler);
    this.handlers.set(topic, set);
    return () => set.delete(fn as Handler);
  }

  emit<T>(topic: string, source: string, payload: T): KernelEvent<T> {
    const ev: KernelEvent<T> = { id: randomUUID(), at: Date.now(), topic, source, payload };
    this.ring.push(ev);
    if (this.ring.length > this.capacity) {
      this.ring.shift();
      this.dropped++;
    }
    for (const [pattern, set] of this.handlers) {
      if (!matches(pattern, topic)) continue;
      for (const fn of set) void Promise.resolve(fn(ev)).catch(() => {});
    }
    return ev;
  }

  /** Last n events, newest first. Optional topic prefix filter. */
  tail(n = 50, prefix?: string): KernelEvent[] {
    const src = prefix ? this.ring.filter((e) => e.topic.startsWith(prefix)) : this.ring;
    return src.slice(-n).reverse();
  }

  stats() {
    return { held: this.ring.length, capacity: this.capacity, dropped: this.dropped, topics: this.handlers.size };
  }
}

function matches(pattern: string, topic: string): boolean {
  if (pattern === "*" || pattern === topic) return true;
  if (pattern.endsWith(".*")) return topic.startsWith(pattern.slice(0, -1));
  return false;
}
