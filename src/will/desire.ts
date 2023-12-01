// Ring 1. Desire. A number that rises with silence and falls with speech.
//
// Posting on a timer makes a bot. Posting when a pressure crosses a line makes
// something that looks like it has moods. The pressure is simple on purpose.

export interface DesireState {
  pressure: number; // 0..1
  lastSpokeAt: number;
  lastHeardAt: number;
}

export class Desire {
  private s: DesireState;

  constructor(private halfLifeMs = 45 * 60_000, now = Date.now()) {
    this.s = { pressure: 0.2, lastSpokeAt: now, lastHeardAt: now };
  }

  /** Silence builds pressure toward 1 with the configured half-life. */
  tick(now: number): number {
    const dt = now - this.s.lastSpokeAt;
    const target = 1 - Math.pow(0.5, dt / this.halfLifeMs);
    this.s.pressure = Math.max(this.s.pressure, target);
    return this.s.pressure;
  }

  /** Being mentioned is a spike. Being ignored is not. */
  heard(now: number, weight = 0.15): void {
    this.s.lastHeardAt = now;
    this.s.pressure = Math.min(1, this.s.pressure + weight);
  }

  spoke(now: number): void {
    this.s.lastSpokeAt = now;
    this.s.pressure = 0.05;
  }

  wants(threshold = 0.6): boolean {
    return this.s.pressure >= threshold;
  }

  state(): DesireState {
    return { ...this.s };
  }
}
