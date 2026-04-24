// Ring 2. Style guard. The last pass before a draft goes to the guardian.
// It does not change what the mind said. It only makes sure it sounds like itself.

const MAX = 280;

export interface StyleReport {
  text: string;
  changed: string[];
  ok: boolean;
}

export function style(input: string, signature: string): StyleReport {
  const changed: string[] = [];
  let t = input.trim();

  if (/^["'“”]/.test(t) && /["'“”]$/.test(t)) {
    t = t.slice(1, -1);
    changed.push("unquoted");
  }
  if (/#\w+/.test(t)) {
    t = t.replace(/\s*#\w+/g, "");
    changed.push("stripped hashtags");
  }
  if (t.includes(signature)) {
    t = t.replace(signature, "").trim();
    changed.push("signature is implied, not typed");
  }
  if (t.length > MAX) {
    const cut = t.slice(0, MAX);
    t = cut.slice(0, Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("\n"), 200) + 1).trim();
    changed.push("trimmed to fit");
  }
  return { text: t, changed, ok: t.length >= 2 && t.length <= MAX };
}
