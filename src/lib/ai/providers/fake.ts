import type { AIProvider, ProviderRequest, ProviderResult } from "../provider";

export class FakeProvider implements AIProvider {
  async complete(request: ProviderRequest): Promise<ProviderResult> {
    const text = request.user.toLowerCase();
    if (text.includes("__fake_invalid__")) {
      return { toolName: request.tool.name, toolArgs: { invalid: true }, inputTokens: 20, outputTokens: 5 };
    }
    if (text.includes("__fake_unauthorized_tool__")) {
      return {
        toolName: "delete_project",
        toolArgs: {
          title: "Fake unauthorized tool",
          summary: "fake provider requested a tool outside the allowlist",
          severity: "medium",
          category: "needs_human",
          suggestedFix: "بررسی دستی",
          confidence: 0.5,
          needsHuman: true,
          evidence: ["__FAKE_UNAUTHORIZED_TOOL__"],
          __toolName: "delete_project",
        },
        inputTokens: 30,
        outputTokens: 10,
      };
    }

    const severity = /نمی.?تواند|cannot|can't|خطا|error|crash|failed|failure/i.test(text)
      ? "high"
      : "medium";
    const category = /ورود|وارد|login|auth|رمز|password/i.test(text)
      ? "authentication"
      : "needs_human";

    return {
      toolName: request.tool.name,
      toolArgs: {
        title: severity === "high" ? "مشکل قابل بررسی" : "گزارش نیازمند بررسی",
        summary: "این خروجی توسط provider جعلی برای آزمون تولید شده است.",
        severity,
        category,
        suggestedFix: "بررسی و بازتولید مشکل بر اساس شواهد موجود",
        confidence: 0.72,
        needsHuman: false,
        evidence: ["provider-fake-evidence"],
      },
      inputTokens: Math.max(1, Math.ceil(request.user.length / 4)),
      outputTokens: 40,
    };
  }
}
