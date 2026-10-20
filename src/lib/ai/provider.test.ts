import { describe, expect, it, afterEach } from "vitest";
import { getAIConfig } from "./provider";

afterEach(() => {
  delete process.env.AI_PROVIDER;
  delete process.env.AI_API_KEY;
  delete process.env.Deep_Seek_ApiKey;
});

describe("AI provider configuration", () => {
  it("defaults to fake", () => {
    expect(getAIConfig().provider).toBe("fake");
  });

  it("accepts the owner's Deep_Seek_ApiKey env name without exposing it", () => {
    process.env.AI_PROVIDER = "deepseek";
    process.env.Deep_Seek_ApiKey = "test-secret";
    const config = getAIConfig();
    expect(config.provider).toBe("deepseek");
    expect(config.apiKey).toBe("test-secret");
  });

  it("does not silently fall back to fake when DeepSeek is selected", async () => {
    process.env.AI_PROVIDER = "deepseek";
    delete process.env.Deep_Seek_ApiKey;
    delete process.env.AI_API_KEY;
    await expect(import("./provider").then(({ getAIProvider }) => getAIProvider())).rejects.toThrow(/API key/i);
  });
});
