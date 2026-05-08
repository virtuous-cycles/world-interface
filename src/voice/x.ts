// Ring 3. The X client. The only thing in the repo that can make a sound in the world.
//
// It is never called directly. voice/compose.ts produces a Draft, the guardian signs it,
// the sys_post handler calls this. In dry-run every write is logged and returned as
// a fake id prefixed "dry_".

import { createHmac, randomBytes } from "node:crypto";

export interface Post {
  id: string;
  author: string;
  text: string;
  at: number;
  replyTo?: string;
}

export interface XCreds {
  apiKey: string;
  apiSecret: string;
  accessToken: string;
  accessSecret: string;
}

export interface XClient {
  handle: string;
  timeline: (max: number) => Promise<Post[]>;
  mentions: (sinceId?: string) => Promise<Post[]>;
  post: (text: string, replyTo?: string) => Promise<{ id: string }>;
  like: (id: string) => Promise<void>;
  follow: (handle: string) => Promise<void>;
}

const API = "https://api.x.com/2";

export function xClient(handle: string, creds: XCreds, dryRun: boolean): XClient {
  const call = async <T>(method: string, path: string, body?: unknown, query?: Record<string, string>): Promise<T> => {
    const url = new URL(API + path);
    for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);
    const res = await fetch(url, {
      method,
      headers: { Authorization: oauth1(method, url, creds), "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`x ${method} ${path}: ${res.status} ${await res.text()}`);
    return (await res.json()) as T;
  };

  const toPosts = (r: { data?: { id: string; text: string; author_id: string; created_at?: string }[] }): Post[] =>
    (r.data ?? []).map((d) => ({ id: d.id, author: d.author_id, text: d.text, at: Date.parse(d.created_at ?? "") || Date.now() }));

  return {
    handle,
    async timeline(max) {
      if (dryRun) return [];
      return toPosts(await call("GET", "/users/me/timelines/reverse_chronological", undefined, { max_results: String(max), "tweet.fields": "created_at,author_id" }));
    },
    async mentions(sinceId) {
      if (dryRun) return [];
      return toPosts(await call("GET", "/users/me/mentions", undefined, { ...(sinceId ? { since_id: sinceId } : {}), "tweet.fields": "created_at,author_id" }));
    },
    async post(text, replyTo) {
      if (dryRun) return { id: "dry_" + randomBytes(4).toString("hex") };
      const r = await call<{ data: { id: string } }>("POST", "/tweets", { text, ...(replyTo ? { reply: { in_reply_to_tweet_id: replyTo } } : {}) });
      return { id: r.data.id };
    },
    async like(id) {
      if (dryRun) return;
      await call("POST", "/users/me/likes", { tweet_id: id });
    },
    async follow(target) {
      if (dryRun) return;
      await call("POST", "/users/me/following", { target_user_id: target });
    },
  };
}

/** Minimal OAuth 1.0a HMAC-SHA1 header. Enough for user-context endpoints. */
function oauth1(method: string, url: URL, c: XCreds): string {
  const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (ch) => "%" + ch.charCodeAt(0).toString(16).toUpperCase());
  const p: Record<string, string> = {
    oauth_consumer_key: c.apiKey,
    oauth_nonce: randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: c.accessToken,
    oauth_version: "1.0",
  };
  const all = { ...p, ...Object.fromEntries(url.searchParams) };
  const base = [method.toUpperCase(), enc(url.origin + url.pathname), enc(Object.keys(all).sort().map((k) => `${enc(k)}=${enc(all[k])}`).join("&"))].join("&");
  const key = `${enc(c.apiSecret)}&${enc(c.accessSecret)}`;
  p.oauth_signature = createHmac("sha1", key).update(base).digest("base64");
  return "OAuth " + Object.keys(p).sort().map((k) => `${enc(k)}="${enc(p[k])}"`).join(", ");
}
