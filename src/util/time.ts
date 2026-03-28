export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function iso(t = Date.now()): string {
  return new Date(t).toISOString();
}

export function ago(t: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
