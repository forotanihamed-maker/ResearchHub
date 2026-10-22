// src/lib/ai/providers/deepseek.ts
//
// DeepSeek chat completions (OpenAI-compatible): POST {base}/chat/completions.
// Facts from the official docs (api-docs.deepseek.com):
// - thinking mode is ON by default and forbids a forced tool_choice (HTTP 400),
//   so every request sends thinking: {type: "disabled"};
// - tool_calls[].function.arguments is a JSON *string* and may be invalid;
// - usage.prompt_tokens / completion_tokens carry the token counts.
// The API key goes only into the Authorization header. It is never put in a
// URL, a log line or an error message, and error bodies are never echoed
// (a body could contain the prompt).
import type {
  AiProvider,
  ChatRequest,
  ChatResult,
  ChatToolCall,
  CompletionRequest,
  CompletionResult,
  ModelToolCall,
} from "@/lib/ai/provider";
import { AiConfigError, AiProviderError } from "@/lib/ai/provider";

export interface DeepSeekOptions {
  apiKey: string;
  baseUrl: string;
  /**
   * "deepseek": sends thinking:{type:"disabled"} (DeepSeek-only parameter).
   * "openai_compatible": plain OpenAI chat-completions body, for gateways such
   * as AvalAI that proxy several vendors and may reject unknown fields.
   */
  style?: "deepseek" | "openai_compatible";
  /** Some newer OpenAI models require max_completion_tokens instead of max_tokens. */
  tokenParam?: "max_tokens" | "max_completion_tokens";
  /** Some models reject an explicit temperature. */
  omitTemperature?: boolean;
  timeoutMs?: number;
  /** Injected in tests. */
  fetchImpl?: typeof fetch;
  /** Injected in tests so retries do not slow them down. */
  sleep?: (ms: number) => Promise<void>;
}

function isLocalHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

/** Only https (or plain http to localhost for tests) is accepted. */
export function normalizeBaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AiConfigError("AI_BASE_URL is not a valid URL");
  }
  const okProtocol =
    url.protocol === "https:" ||
    (url.protocol === "http:" && isLocalHost(url.hostname));
  if (!okProtocol || url.username || url.password) {
    throw new AiConfigError("AI_BASE_URL must be an https URL without credentials");
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}`;
}

export class DeepSeekProvider implements AiProvider {
  readonly name: string;
  private readonly style: "deepseek" | "openai_compatible";
  private readonly tokenParam: "max_tokens" | "max_completion_tokens";
  private readonly omitTemperature: boolean;
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: DeepSeekOptions) {
    this.endpoint = `${normalizeBaseUrl(options.baseUrl)}/chat/completions`;
    this.apiKey = options.apiKey;
    this.style = options.style ?? "deepseek";
    this.name = this.style;
    this.tokenParam = options.tokenParam ?? "max_tokens";
    this.omitTemperature = options.omitTemperature ?? false;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep =
      options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const payload: Record<string, unknown> = {
      model: req.model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: req.tool.name,
            description: req.tool.description,
            parameters: req.tool.parameters,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: req.tool.name } },
      [this.tokenParam]: req.maxOutputTokens,
      stream: false,
    };
    if (this.style === "deepseek") payload.thinking = { type: "disabled" };
    if (!this.omitTemperature) payload.temperature = 0;
    return this.send(JSON.stringify(payload), parseCompletion);
  }

  async chat(req: ChatRequest): Promise<ChatResult> {
    const payload: Record<string, unknown> = {
      model: req.model,
      messages: req.messages.map((m) => {
        if (m.role === "assistant") {
          return {
            role: "assistant",
            content: m.content,
            ...(m.toolCalls.length > 0
              ? { tool_calls: m.toolCalls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.argumentsJson } })) }
              : {}),
          };
        }
        if (m.role === "tool") return { role: "tool", tool_call_id: m.toolCallId, content: m.content };
        return { role: m.role, content: m.content };
      }),
      tools: req.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } })),
      tool_choice: "auto",
      [this.tokenParam]: req.maxOutputTokens,
      stream: false,
    };
    if (this.style === "deepseek") payload.thinking = { type: "disabled" };
    if (!this.omitTemperature) payload.temperature = 0;
    return this.send(JSON.stringify(payload), parseChat);
  }

  /** One retry for network errors, 429 and 5xx. Never for other 4xx. */
  private async send<T>(body: string, parse: (data: unknown) => T): Promise<T> {
    let lastError: AiProviderError | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await this.sleep(1000);
      try {
        return await this.once(body, parse);
      } catch (error) {
        if (!(error instanceof AiProviderError)) throw error;
        lastError = error;
        if (!error.retryable) throw error;
      }
    }
    throw lastError ?? new AiProviderError("provider call failed", null, false);
  }

  private async once<T>(body: string, parse: (data: unknown) => T): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let response: Response;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body,
        signal: controller.signal,
      });
    } catch {
      // The underlying error text can include the URL; keep only a fixed label.
      throw new AiProviderError("network error or timeout", null, true);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new AiProviderError(`provider returned HTTP ${response.status}`, response.status, retryable);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new AiProviderError("provider returned invalid JSON", response.status, false);
    }
    return parse(data);
  }
}

function asCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : 0;
}

/** Extracts tool calls and usage from a chat-completions response. */
export function parseCompletion(data: unknown): CompletionResult {
  const root = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
  const choices = Array.isArray(root.choices) ? root.choices : [];
  const message = (choices[0] as { message?: Record<string, unknown> } | undefined)?.message;
  const rawCalls = Array.isArray(message?.tool_calls) ? (message?.tool_calls as unknown[]) : [];

  const toolCalls: ModelToolCall[] = [];
  for (const call of rawCalls) {
    const fn = (call as { function?: { name?: unknown; arguments?: unknown } })?.function;
    if (typeof fn?.name !== "string") continue;
    toolCalls.push({
      name: fn.name,
      argumentsJson: typeof fn.arguments === "string" ? fn.arguments : "",
    });
  }

  const usage = (root.usage ?? {}) as Record<string, unknown>;
  const first = choices[0] as { finish_reason?: unknown } | undefined;
  return {
    toolCalls,
    finishReason: typeof first?.finish_reason === "string" ? first.finish_reason.slice(0, 40) : undefined,
    hadText: typeof message?.content === "string" && message.content.trim().length > 0,
    inputTokens: asCount(usage.prompt_tokens),
    outputTokens: asCount(usage.completion_tokens),
  };
}

/** Extracts text, tool calls (with ids) and usage from a chat-completions response. */
export function parseChat(data: unknown): ChatResult {
  const root = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
  const choices = Array.isArray(root.choices) ? root.choices : [];
  const first = choices[0] as { message?: Record<string, unknown>; finish_reason?: unknown } | undefined;
  const message = first?.message;
  const rawCalls = Array.isArray(message?.tool_calls) ? (message?.tool_calls as unknown[]) : [];
  const toolCalls: ChatToolCall[] = [];
  rawCalls.slice(0, 8).forEach((call, i) => {
    const c = call as { id?: unknown; function?: { name?: unknown; arguments?: unknown } };
    if (typeof c?.function?.name !== "string") return;
    toolCalls.push({
      id: typeof c.id === "string" && c.id.length > 0 ? c.id.slice(0, 100) : `call_${i}`,
      name: c.function.name,
      argumentsJson: typeof c.function.arguments === "string" ? c.function.arguments : "",
    });
  });
  const usage = (root.usage ?? {}) as Record<string, unknown>;
  return {
    content: typeof message?.content === "string" ? message.content : null,
    toolCalls,
    finishReason: typeof first?.finish_reason === "string" ? first.finish_reason.slice(0, 40) : undefined,
    inputTokens: asCount(usage.prompt_tokens),
    outputTokens: asCount(usage.completion_tokens),
  };
}
