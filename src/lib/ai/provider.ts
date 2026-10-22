// src/lib/ai/provider.ts
//
// One interface for every model provider, plus the configuration that picks
// one. The model is only ever given ONE tool (submit_triage) and no network or
// write capability; whatever else it tries to call is reported back so the
// caller can refuse and log it.
import { DeepSeekProvider } from "@/lib/ai/providers/deepseek";
import { FakeProvider } from "@/lib/ai/providers/fake";

export interface ToolDef {
  name: string;
  description: string;
  /** JSON Schema of the arguments. */
  parameters: Record<string, unknown>;
}

export interface CompletionRequest {
  model: string;
  system: string;
  user: string;
  tool: ToolDef;
  maxOutputTokens: number;
}

export interface ModelToolCall {
  name: string;
  /** Raw JSON string exactly as the model produced it (untrusted). */
  argumentsJson: string;
}

export interface CompletionResult {
  toolCalls: ModelToolCall[];
  /** Diagnostics only (never user text): why the model stopped, and whether it answered in plain text. */
  finishReason?: string;
  hadText?: boolean;
  inputTokens: number;
  outputTokens: number;
}

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; toolCalls: ChatToolCall[] }
  | { role: "tool"; toolCallId: string; content: string };

export interface ChatToolCall {
  id: string;
  name: string;
  /** Raw JSON string exactly as the model produced it (untrusted). */
  argumentsJson: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  tools: ToolDef[];
  maxOutputTokens: number;
}

export interface ChatResult {
  content: string | null;
  toolCalls: ChatToolCall[];
  finishReason?: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AiProvider {
  readonly name: string;
  complete(req: CompletionRequest): Promise<CompletionResult>;
  /** Multi-turn call with several tools (used only by the code-analysis loop). */
  chat(req: ChatRequest): Promise<ChatResult>;
}

/** Misconfiguration (missing key, bad URL). Never carries secret values. */
export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigError";
  }
}

/** Provider call failed. Carries the HTTP status only, never a body or key. */
export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly retryable: boolean
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}

export type Env = Record<string, string | undefined>;

export interface AiConfig {
  enabled: boolean;
  provider: "fake" | "deepseek" | "openai_compatible";
  triageModel: string;
  deepModel: string;
  baseUrl: string;
  monthlyCapUsd: number;
  batchSize: number;
  /** Output cap per call. Reasoning models spend part of it on hidden reasoning. */
  maxOutputTokens: number;
}

const DEFAULT_CAP_USD = 5;

function positiveNumber(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return raw !== undefined && raw.trim() !== "" && Number.isFinite(n) && n > 0
    ? n
    : fallback;
}

/** Reads and validates configuration. Pure; takes the env as an argument. */
export function getAiConfig(env: Env = process.env): AiConfig {
  const requested = (env.AI_PROVIDER ?? "fake").trim().toLowerCase();
  if (requested !== "fake" && requested !== "deepseek" && requested !== "openai_compatible") {
    throw new AiConfigError("AI_PROVIDER must be 'fake', 'deepseek' or 'openai_compatible'");
  }
  const provider = requested;
  const compat = provider === "openai_compatible";
  if (compat && !env.AI_BASE_URL?.trim()) {
    // No default: a key meant for a gateway must never be sent to another host.
    throw new AiConfigError("AI_PROVIDER=openai_compatible requires AI_BASE_URL");
  }
  if (compat && !env.AI_MODEL_TRIAGE?.trim()) {
    throw new AiConfigError("AI_PROVIDER=openai_compatible requires AI_MODEL_TRIAGE");
  }
  const batch = Math.floor(positiveNumber(env.AI_TRIAGE_BATCH, 20));
  return {
    enabled: (env.AI_ENABLED ?? "true").trim().toLowerCase() !== "false",
    provider,
    triageModel:
      env.AI_MODEL_TRIAGE?.trim() ||
      (provider === "fake" ? "fake-triage" : "deepseek-flash"),
    deepModel:
      env.AI_MODEL_DEEP?.trim() ||
      (provider === "fake"
        ? "fake-deep"
        : compat
          ? (env.AI_MODEL_TRIAGE as string).trim() // no escalation unless set
          : "deepseek-v4-pro"),
    baseUrl: env.AI_BASE_URL?.trim() || "https://api.deepseek.com",
    monthlyCapUsd: positiveNumber(env.AI_MONTHLY_CAP_USD, DEFAULT_CAP_USD),
    batchSize: Math.min(50, Math.max(1, batch)),
    maxOutputTokens: Math.min(8000, Math.max(200, Math.floor(positiveNumber(env.AI_MAX_OUTPUT_TOKENS, 700)))),
  };
}

/** The API key. The owner stores it as Deep_Seek_ApiKey; others are fallbacks. */
export function getApiKey(
  env: Env = process.env,
  provider: AiConfig["provider"] = "deepseek"
): string | undefined {
  // A gateway gets ONLY AI_API_KEY, so a DeepSeek key is never sent to it.
  const key =
    provider === "openai_compatible"
      ? env.AI_API_KEY
      : env.Deep_Seek_ApiKey ?? env.DEEPSEEK_API_KEY ?? env.AI_API_KEY;
  return key && key.trim() ? key.trim() : undefined;
}

/**
 * Builds the provider. With AI_PROVIDER=deepseek and no key this throws; it
 * NEVER silently falls back to the fake provider, because that would look like
 * a working system while analysing nothing.
 */
export function getProvider(
  config: AiConfig = getAiConfig(),
  env: Env = process.env
): AiProvider {
  if (config.provider === "fake") return new FakeProvider();
  const apiKey = getApiKey(env, config.provider);
  if (!apiKey) {
    throw new AiConfigError(
      config.provider === "openai_compatible"
        ? "AI_PROVIDER=openai_compatible but no API key is set (AI_API_KEY)"
        : "AI_PROVIDER=deepseek but no API key is set (Deep_Seek_ApiKey)"
    );
  }
  if (config.provider === "openai_compatible") {
    return new DeepSeekProvider({
      apiKey,
      baseUrl: config.baseUrl,
      style: "openai_compatible",
      tokenParam:
        env.AI_TOKEN_PARAM === "max_completion_tokens" ? "max_completion_tokens" : "max_tokens",
      omitTemperature: (env.AI_OMIT_TEMPERATURE ?? "").trim().toLowerCase() === "true",
    });
  }
  return new DeepSeekProvider({ apiKey, baseUrl: config.baseUrl });
}
