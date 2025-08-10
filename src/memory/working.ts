// Ring 1. Working memory. A ring of recent events the mind can feel right now.

import type { KernelEvent } from "../types.js";

export class WorkingMemory {
  private buf: KernelEvent[] = [];

  constructor(private window: number) {}

  push(ev: KernelEvent): void {
    this.buf.push(ev);
    if (this.buf.length > this.window) this.buf.shift();
  }

  recent(n = this.window, prefix?: string): KernelEvent[] {
    const src = prefix ? this.buf.filter((e) => e.topic.startsWith(prefix)) : this.buf;
    return src.slice(-n);
  }

  clear(): void {
    this.buf = [];
  }

  size(): number {
    return this.buf.length;
  }
}
