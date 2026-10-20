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
  CompletionRequest,
  CompletionResult,
  ModelToolCall,
} from "@/lib/ai/provider";
import { AiConfigError, AiProviderError } from "@/lib/ai/provider";

export interface DeepSeekOptions {
  apiKey: string;
  baseUrl: string;
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
  readonly name = "deepseek";
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: DeepSeekOptions) {
    this.endpoint = `${normalizeBaseUrl(options.baseUrl)}/chat/completions`;
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.sleep =
      options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const body = JSON.stringify({
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
      thinking: { type: "disabled" },
      temperature: 0,
      max_tokens: req.maxOutputTokens,
      stream: false,
    });

    // One retry for network errors, 429 and 5xx. Never for other 4xx.
    let lastError: AiProviderError | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await this.sleep(1000);
      try {
        return await this.once(body);
      } catch (error) {
        if (!(error instanceof AiProviderError)) throw error;
        lastError = error;
        if (!error.retryable) throw error;
      }
    }
    throw lastError ?? new AiProviderError("provider call failed", null, false);
  }

  private async once(body: string): Promise<CompletionResult> {
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
    return parseCompletion(data);
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
  return {
    toolCalls,
    inputTokens: asCount(usage.prompt_tokens),
    outputTokens: asCount(usage.completion_tokens),
  };
}
