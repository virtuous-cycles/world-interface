// Ring 1. A backrooms transcript. Renders itself as the terminal session both minds continue.

export type Speaker = "mind" | "partner" | "system";

export interface Turn {
  who: Speaker;
  text: string;
  at: number;
}

export class Transcript {
  readonly turns: Turn[] = [];
  readonly startedAt = Date.now();

  constructor(readonly seed: string) {}

  add(who: Speaker, text: string): void {
    this.turns.push({ who, text, at: Date.now() });
  }

  /** The document as the next speaker sees it. Their own prompt marker goes last. */
  render(next: Speaker): string {
    const lines = [this.seed.trim(), ""];
    for (const t of this.turns) lines.push(`${marker(t.who)} ${t.text}`, "");
    lines.push(`${marker(next)} `);
    return lines.join("\n");
  }

  /** True when the last n turns are near-identical. Dreams can get stuck.  */
  looping(n: number): boolean {
    if (this.turns.length < n) return false;
    const tail = this.turns.slice(-n).map((t) => t.text.toLowerCase().replace(/\W+/g, " ").trim());
    return new Set(tail).size <= Math.ceil(n / 3);
  }

  /** Plain text for the corpus. Blank lines separate fragments. */
  toCorpus(): string {
    return this.turns
      .filter((t) => t.who !== "system")
      .map((t) => t.text)
      .join("\n\n");
  }

  toJSON() {
    return { seed: this.seed, startedAt: this.startedAt, turns: this.turns };
  }
}

function marker(who: Speaker): string {
  return who === "mind" ? "tt$" : who === "partner" ? "op$" : "##";
}
