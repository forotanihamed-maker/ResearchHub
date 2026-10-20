import type { AIProvider, ProviderRequest, ProviderResult } from "../provider";

interface DeepSeekProviderOptions {
  apiKey: string;
  baseUrl: string;
}

const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 1;

export class DeepSeekProvider implements AIProvider {
  constructor(private readonly options: DeepSeekProviderOptions) {}

  async complete(request: ProviderRequest): Promise<ProviderResult> {
    const body = {
      model: request.model,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: request.tool.name,
            description: request.tool.description,
            parameters: request.tool.parameters,
            strict: true,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: request.tool.name } },
      thinking: { type: "disabled" },
      max_tokens: 2000,
      stream: false,
    };

    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        let response: Response;
        try {
          response = await fetch(`${this.options.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.options.apiKey}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }

        if (!response.ok) {
          const status = response.status;
          if (status >= 400 && status < 500) {
            throw new Error(`DeepSeek request rejected (${status})`);
          }
          throw new RetryableProviderError(`DeepSeek server error (${status})`);
        }

        const json = (await response.json()) as {
          choices?: Array<{ message?: { tool_calls?: Array<{ function?: { name?: string; arguments?: string } }> } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };
        const call = json.choices?.[0]?.message?.tool_calls?.[0]?.function;
        if (!call?.name || typeof call.arguments !== "string") {
          throw new RetryableProviderError("DeepSeek response did not contain a tool call");
        }

        let toolArgs: unknown;
        try {
          toolArgs = JSON.parse(call.arguments);
        } catch {
          throw new RetryableProviderError("DeepSeek tool arguments were not valid JSON");
        }

        return {
          toolName: call.name,
          toolArgs: call.name === request.tool.name ? toolArgs : { __toolName: call.name, ...asRecord(toolArgs) },
          inputTokens: json.usage?.prompt_tokens ?? 0,
          outputTokens: json.usage?.completion_tokens ?? 0,
        };
      } catch (error) {
        lastError = error;
        if (!(error instanceof RetryableProviderError) || attempt >= MAX_RETRIES) throw error;
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
    throw lastError instanceof Error ? lastError : new Error("DeepSeek provider failed");
  }
}

class RetryableProviderError extends Error {}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
