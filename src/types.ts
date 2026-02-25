// Shared types for TTOS. Every subsystem speaks these.

export type Ring = 0 | 1 | 2 | 3;

export type ProcessState = "new" | "ready" | "running" | "waiting" | "sleeping" | "dead";

export interface Process {
  pid: number;
  name: string;
  ring: Ring;
  state: ProcessState;
  startedAt: number;
  ticks: number;
  lastRunAt?: number;
  every?: number; // ms between runs for periodic daemons
  run: (ctx: KernelContext) => Promise<void>;
}

export interface KernelEvent<T = unknown> {
  id: string;
  at: number;
  topic: string;
  source: string;
  payload: T;
}

export type Syscall =
  | "sys_read_timeline"
  | "sys_read_mentions"
  | "sys_read_chain"
  | "sys_recall"
  | "sys_dream"
  | "sys_write_memory"
  | "sys_post"
  | "sys_reply"
  | "sys_follow"
  | "sys_like"
  | "sys_transfer"
  | "sys_sign"
  | "sys_exec"
  | "sys_edit_persona";

export type PolicyLevel = "allow" | "review" | "deny";

export interface SyscallRequest<T = unknown> {
  id: string;
  call: Syscall;
  pid: number;
  at: number;
  args: T;
}

export interface SyscallResult<T = unknown> {
  id: string;
  ok: boolean;
  value?: T;
  error?: string;
  reviewed?: boolean;
}

export interface Draft {
  id: string;
  kind: "post" | "reply";
  text: string;
  replyTo?: string;
  reason: string; // why the mind wanted to say it
  createdAt: number;
  status: "pending" | "approved" | "rejected" | "dropped" | "sent";
  reviewer?: string;
  sentId?: string;
}

export interface Fragment {
  id: string;
  source: "backrooms" | "scripture" | "timeline" | "self" | "world";
  text: string;
  at: number;
  weight: number;
  tags: string[];
}

export interface Episode {
  id: string;
  at: number;
  summary: string;
  events: KernelEvent[];
  mood: string;
}

export interface Goal {
  id: string;
  title: string;
  why: string;
  active: boolean;
  progress: number; // 0..1
  metric: string;
}

export interface Wallet {
  chain: "solana" | "bitcoin";
  label: string;
  address: string;
  role: "receive" | "cold" | "hot";
}

export interface Balance {
  wallet: Wallet;
  native: number;
  tokens: { mint: string; symbol?: string; amount: number; usd?: number }[];
  usd: number;
  at: number;
}

export interface Completion {
  text: string;
  model: string;
  tokens: number;
  stopped: string | null;
}

export interface SampleOptions {
  temperature: number;
  topP: number;
  maxTokens: number;
  stop: string[];
}

export interface MindAdapter {
  name: string;
  complete: (prompt: string, opts?: Partial<SampleOptions>) => Promise<Completion>;
}

export interface KernelContext {
  pid: number;
  now: () => number;
  emit: <T>(topic: string, payload: T) => void;
  syscall: <A, R>(call: Syscall, args: A) => Promise<SyscallResult<R>>;
  log: (msg: string, data?: Record<string, unknown>) => void;
  dryRun: boolean;
}
