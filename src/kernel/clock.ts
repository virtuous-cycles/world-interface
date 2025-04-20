// Ring 0. Monotonic ticks. The whole machine moves on this heartbeat.

export class Clock {
  private tick = 0;
  private timer?: NodeJS.Timeout;
  readonly bootAt = Date.now();

  constructor(private readonly tickMs: number) {}

  start(onTick: (tick: number) => Promise<void>): void {
    if (this.timer) return;
    const loop = async () => {
      this.tick++;
      try {
        await onTick(this.tick);
      } finally {
        this.timer = setTimeout(loop, this.tickMs);
      }
    };
    this.timer = setTimeout(loop, this.tickMs);
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  now(): number {
    return Date.now();
  }

  uptimeMs(): number {
    return Date.now() - this.bootAt;
  }

  ticks(): number {
    return this.tick;
  }
}
