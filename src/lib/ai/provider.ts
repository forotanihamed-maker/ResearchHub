export interface ProviderTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ProviderRequest {
  model: string;
  system: string;
  user: string;
  tool: ProviderTool;
}

export interface ProviderResult {
  toolName: string;
  toolArgs: unknown;
  inputTokens: number;
  outputTokens: number;
}

export interface AIProvider {
  complete(request: ProviderRequest): Promise<ProviderResult>;
}

export type AIProviderName = "fake" | "deepseek";

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function getAIConfig() {
  const provider = (env("AI_PROVIDER") ?? "fake").toLowerCase();
  if (provider !== "fake" && provider !== "deepseek") {
    throw new Error("AI_PROVIDER must be fake or deepseek");
  }

  return {
    provider: provider as AIProviderName,
    // Backward-compatible with the owner's explicitly named secret. The
    // generic name remains the documented default for future deployments.
    apiKey: env("Deep_Seek_ApiKey") ?? env("AI_API_KEY"),
    baseUrl: (env("AI_BASE_URL") ?? "https://api.deepseek.com").replace(/\/$/, ""),
    triageModel: env("AI_MODEL_TRIAGE") ?? "deepseek-flash",
    deepModel: env("AI_MODEL_DEEP") ?? "deepseek-v4-pro",
    enabled: (env("AI_ENABLED") ?? "true").toLowerCase() !== "false",
    monthlyCapUsd: env("AI_MONTHLY_CAP_USD") ?? "5",
  };
}

export async function getAIProvider(): Promise<AIProvider> {
  const config = getAIConfig();
  if (config.provider === "fake") {
    const { FakeProvider } = await import("./providers/fake");
    return new FakeProvider();
  }
  if (!config.apiKey) {
    throw new Error("DeepSeek provider is enabled but API key (Deep_Seek_ApiKey/AI_API_KEY) is not configured");
  }
  const { DeepSeekProvider } = await import("./providers/deepseek");
  return new DeepSeekProvider({
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
  });
}
