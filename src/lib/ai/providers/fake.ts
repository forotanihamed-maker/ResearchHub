// src/lib/ai/providers/fake.ts
//
// Deterministic provider for tests and for running the pipeline at zero cost.
// It records every request it receives (so tests can prove what would have
// been sent to a real provider) and can be scripted to misbehave.
import type {
  AiProvider,
  ChatRequest,
  ChatResult,
  CompletionRequest,
  CompletionResult,
} from "@/lib/ai/provider";

const HIGH = /(نمی[‌ ]?تواند وارد|ورود.*(نمی|خطا)|login|crash|کرش|500|پاک شد|از دست رفت|داده.*(نادرست|حذف)|امنیت|نشت|توکن|رمز)/i;
const LOW = /(پیشنهاد|ظاهر|رنگ|فونت|typo|غلط املایی)/i;

/** Text inside the <user_report>/<error_event> block, or the whole input. */
function dataBlock(user: string): string {
  const m = /<(user_report|error_event)>([\s\S]*?)<\/\1>/.exec(user);
  return (m ? m[2] : user).trim();
}

export interface FakeOptions {
  /** Scripted answers for chat(): called with the request and the chat call number (1-based). */
  respondChat?: (req: ChatRequest, callNumber: number) => ChatResult | Promise<ChatResult>;
  /** Replace the answer entirely (e.g. to return invalid output). */
  respond?: (req: CompletionRequest, callNumber: number) => CompletionResult | Promise<CompletionResult>;
}

export class FakeProvider implements AiProvider {
  readonly name = "fake";
  /** Every request seen, in order. */
  readonly calls: CompletionRequest[] = [];
  /** Every chat() request seen, in order. */
  readonly chatCalls: ChatRequest[] = [];

  constructor(private readonly options: FakeOptions = {}) {}

  async chat(req: ChatRequest): Promise<ChatResult> {
    this.chatCalls.push(req);
    if (this.options.respondChat) return this.options.respondChat(req, this.chatCalls.length);
    return { content: "no script", toolCalls: [], inputTokens: 0, outputTokens: 0 };
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    this.calls.push(req);
    if (this.options.respond) {
      return this.options.respond(req, this.calls.length);
    }

    const text = dataBlock(req.user);
    const severity = HIGH.test(text) ? "high" : LOW.test(text) ? "low" : "medium";
    const evidence = text.slice(0, 60).trim();
    const args = {
      title: `بررسی: ${text.slice(0, 40).trim() || "گزارش"}`,
      summary: `خلاصه‌ی خودکار (provider جعلی): ${text.slice(0, 120).trim()}`,
      severity,
      category: severity === "high" ? "bug" : "other",
      suggestedFix: "نیاز به بررسی دستی کد مربوط به این صفحه.",
      confidence: 0.6,
      needsHuman: false,
      evidence: evidence ? [evidence] : [],
    };
    return {
      toolCalls: [{ name: req.tool.name, argumentsJson: JSON.stringify(args) }],
      inputTokens: Math.ceil((req.system.length + req.user.length) / 3),
      outputTokens: Math.ceil(JSON.stringify(args).length / 3),
    };
  }
}
