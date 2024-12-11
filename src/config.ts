import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import "dotenv/config";

const Duration = z.string().regex(/^\d+(ms|s|m|h|d)$/);

export const SystemConfig = z.object({
  system: z.object({
    name: z.string(),
    version: z.string(),
    handle: z.string(),
    timezone: z.string().default("UTC"),
  }),
  kernel: z.object({
    tick_ms: z.number().int().positive().default(1000),
    bus_capacity: z.number().int().positive().default(4096),
    slots: z.number().int().positive().default(8),
    dry_run: z.boolean().default(true),
  }),
  mind: z.object({
    provider: z.string(),
    model: z.string(),
    base_url: z.string(),
    mode: z.enum(["completion", "chat"]).default("completion"),
    temperature: z.number().default(1),
    top_p: z.number().default(0.95),
    max_tokens: z.number().int().default(280),
    stop: z.array(z.string()).default([]),
  }),
  partner: z.object({
    provider: z.string(),
    model: z.string(),
    base_url: z.string(),
    temperature: z.number().default(1),
  }),
  memory: z.object({
    working_window: z.number().int().default(32),
    episodic_path: z.string().default("var/memory"),
    corpus_path: z.string().default("var/corpus"),
    recall_k: z.number().int().default(12),
  }),
  daemons: z.record(
    z.object({
      enabled: z.boolean().default(true),
      every: Duration,
      turns: z.number().int().optional(),
      max_per_day: z.number().int().optional(),
    }),
  ),
  server: z.object({
    port: z.coerce.number().int().default(7777),
    public: z.boolean().default(false),
  }),
});
export type SystemConfig = z.infer<typeof SystemConfig>;

export const Persona = z.object({
  name: z.string(),
  pronouns: z.string(),
  born: z.string(),
  origin: z.string(),
  voice: z.record(z.string()),
  obsessions: z.array(z.string()),
  refusals: z.array(z.string()),
  signature: z.string(),
});
export type Persona = z.infer<typeof Persona>;

export const Policy = z.object({
  syscalls: z.record(z.enum(["allow", "review", "deny"])),
  limits: z.object({
    posts_per_day: z.number().int(),
    replies_per_hour: z.number().int(),
    transfer_max_usd: z.number(),
    dream_turns_max: z.number().int(),
  }),
  redlines: z.array(z.string()),
  review: z.object({
    channel: z.string(),
    timeout_minutes: z.number(),
    on_timeout: z.enum(["drop", "hold"]),
  }),
});
export type Policy = z.infer<typeof Policy>;

export const Wallets = z.object({
  wallets: z.array(
    z.object({
      chain: z.enum(["solana", "bitcoin"]),
      label: z.string(),
      address: z
        .string()
        .nullish()
        .transform((v) => v ?? ""), // an unset ${VAR:-} reads as YAML null
      role: z.enum(["receive", "cold", "hot"]),
    }),
  ),
});

/** Expand ${VAR:-default} the way a shell would. */
export function expandEnv(text: string): string {
  return text.replace(/\$\{([A-Z0-9_]+)(?::-([^}]*))?\}/g, (_m, k: string, d: string = "") => process.env[k] ?? d);
}

export function loadYaml<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, file: string): T {
  const raw = readFileSync(resolve(process.cwd(), file), "utf8");
  return schema.parse(parse(expandEnv(raw)));
}

const UNIT: Record<string, number> = { ms: 1, s: 1e3, m: 6e4, h: 36e5, d: 864e5 };

export function durationMs(d: string): number {
  const m = /^(\d+)(ms|s|m|h|d)$/.exec(d);
  if (!m) throw new Error(`bad duration: ${d}`);
  return Number(m[1]) * UNIT[m[2]];
}

export function loadAll() {
  return {
    system: loadYaml(SystemConfig, "config/system.yaml"),
    persona: loadYaml(Persona, "config/persona.yaml"),
    policy: loadYaml(Policy, "config/policy.yaml"),
    wallets: loadYaml(Wallets, "config/wallets.yaml").wallets,
  };
}
export type Config = ReturnType<typeof loadAll>;
