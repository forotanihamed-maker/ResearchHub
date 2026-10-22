import { describe, expect, it } from "vitest";
import { DeepSeekProvider } from "@/lib/ai/providers/deepseek";

describe("provider chat()", () => {
  it("sends assistant tool calls and tool results in OpenAI format, tool_choice auto, key only in header", async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const p = new DeepSeekProvider({
      apiKey: "sk-test-key-123456789012345", baseUrl: "https://api.avalai.ir/v1", style: "openai_compatible",
      tokenParam: "max_completion_tokens", omitTemperature: true,
      fetchImpl: (async (url: string, init: RequestInit) => {
        seen = { url, init };
        return new Response(JSON.stringify({ choices: [{ message: { content: "ok", tool_calls: [] }, finish_reason: "stop" }], usage: { prompt_tokens: 5, completion_tokens: 2 } }), { status: 200 });
      }) as unknown as typeof fetch,
    });
    const r = await p.chat({
      model: "m",
      maxOutputTokens: 300,
      tools: [{ name: "read_file", description: "d", parameters: { type: "object" } }],
      messages: [
        { role: "system", content: "s" },
        { role: "user", content: "u" },
        { role: "assistant", content: null, toolCalls: [{ id: "c1", name: "read_file", argumentsJson: '{"path":"src/a.ts"}' }] },
        { role: "tool", toolCallId: "c1", content: "file text" },
      ],
    });
    expect(r.content).toBe("ok");
    const body = JSON.parse(String(seen!.init.body));
    expect(body.tool_choice).toBe("auto");
    expect(body.max_completion_tokens).toBe(300);
    expect(body.temperature).toBeUndefined();
    expect(body.thinking).toBeUndefined();
    expect(body.messages[2]).toEqual({ role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "read_file", arguments: '{"path":"src/a.ts"}' } }] });
    expect(body.messages[3]).toEqual({ role: "tool", tool_call_id: "c1", content: "file text" });
    expect(seen!.url).not.toContain("sk-test");
    expect(JSON.stringify(body)).not.toContain("sk-test");
  });

  it("retries once on 5xx and never leaks the body in the error", async () => {
    let n = 0;
    const p = new DeepSeekProvider({
      apiKey: "k", baseUrl: "https://api.avalai.ir/v1", style: "openai_compatible", sleep: async () => {},
      fetchImpl: (async () => { n++; return new Response("prompt and sk-leak here", { status: 503 }); }) as unknown as typeof fetch,
    });
    const err = await p.chat({ model: "m", maxOutputTokens: 10, tools: [], messages: [{ role: "user", content: "x" }] }).catch((e) => e);
    expect(n).toBe(2);
    expect(String(err.message)).not.toContain("sk-leak");
  });
});
