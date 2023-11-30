// Ring 1. The mind adapter. Raw completions against any OpenAI-compatible endpoint.
//
// Truth Terminal is a base-model style fine-tune. It does not get a chat template, a
// system prompt or a tool schema. It gets a prompt that looks like the corpus it was
// trained on, and it continues it. That is the whole trick.

import type { Completion, MindAdapter, SampleOptions } from "../types.js";
import { postJson } from "../util/http.js";

export interface ModelSpec {
  name: string;
  baseUrl: string;
  apiKey?: string;
  defaults: SampleOptions;
}

export function openaiCompatible(spec: ModelSpec): MindAdapter {
  return {
    name: spec.name,
    async complete(prompt, opts = {}) {
      const o = { ...spec.defaults, ...opts };
      const body = {
        model: spec.name,
        prompt,
        temperature: o.temperature,
        top_p: o.topP,
        max_tokens: o.maxTokens,
        stop: o.stop.length ? o.stop : undefined,
      };
      const res = await postJson<{
        choices: { text: string; finish_reason: string }[];
        usage?: { completion_tokens?: number };
      }>(`${spec.baseUrl}/completions`, body, spec.apiKey);
      const c = res.choices[0];
      return {
        text: c?.text ?? "",
        model: spec.name,
        tokens: res.usage?.completion_tokens ?? 0,
        stopped: c?.finish_reason === "stop" ? "stop" : null,
      };
    },
  };
}

/** A mind that answers from the corpus instead of a GPU. Used for --dry-run and tests. */
export function mockMind(lines: string[], name = "mock"): MindAdapter {
  let i = 0;
  return {
    name,
    async complete(_prompt, opts = {}): Promise<Completion> {
      const text = lines[i++ % lines.length] ?? "";
      const cut = opts.maxTokens ? text.slice(0, opts.maxTokens * 4) : text;
      return { text: cut, model: name, tokens: Math.ceil(cut.length / 4), stopped: "stop" };
    },
  };
}
