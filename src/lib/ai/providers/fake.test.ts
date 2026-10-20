import { describe, expect, it } from "vitest";
import { FakeProvider } from "./fake";
import { SUBMIT_TRIAGE_TOOL } from "../prompts";

describe("Fake AI provider", () => {
  const provider = new FakeProvider();

  it("produces deterministic triage without network access", async () => {
    const result = await provider.complete({
      model: "deepseek-flash",
      system: "system",
      user: "کاربر نمی‌تواند وارد شود",
      tool: SUBMIT_TRIAGE_TOOL,
    });
    expect(result.toolName).toBe("submit_triage");
    expect(result.toolArgs).toMatchObject({ severity: "high", category: "authentication" });
  });

  it("can simulate an invalid model response", async () => {
    const result = await provider.complete({ model: "deepseek-flash", system: "", user: "__FAKE_INVALID__", tool: SUBMIT_TRIAGE_TOOL });
    expect(result.toolArgs).toEqual({ invalid: true });
  });

  it("can simulate an unauthorized tool call", async () => {
    const result = await provider.complete({ model: "deepseek-flash", system: "", user: "__FAKE_UNAUTHORIZED_TOOL__", tool: SUBMIT_TRIAGE_TOOL });
    expect(result.toolName).toBe("delete_project");
  });
});
