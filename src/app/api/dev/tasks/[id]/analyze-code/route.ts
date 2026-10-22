// POST /api/dev/tasks/:id/analyze-code — on-demand, code-aware analysis (costs money, owner only).
// The model can only list/read files under src/ of one repo (see src/lib/ai/code). The result is
// written into the task's "suggested fix" (the earlier analysis is kept below it), so the fix
// prompt picks it up automatically.
import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiAnalysisRuns, aiTasks, aiToolCalls } from "@/db/schema";
import { auditLog } from "@/lib/auditLog";
import { devNotFoundResponse, getDevApiUser } from "@/lib/devAccess";
import { loadTaskDetail } from "@/lib/devTaskDetail";
import { parseId } from "@/lib/validation";
import { AiConfigError, getAiConfig, getProvider } from "@/lib/ai/provider";
import { ensureBudgetRow } from "@/lib/ai/budget";
import { getCodeConfig } from "@/lib/ai/code/config";
import { createGithubReader } from "@/lib/ai/code/githubReader";
import { CodeAnalysisError, analyzeTaskWithCode, composeSuggestedFix, type RunLog } from "@/lib/ai/code/analyze";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
const NO_STORE = { "Cache-Control": "no-store" };
type Params = { params: Promise<{ id: string }> };

const FAILURE_TEXT: Record<string, string> = {
  budget: "بودجه‌ی ماه تمام شده یا توقف اضطراری روشن است.",
  cost_cap: "سقف هزینه‌ی یک تحلیل رسید؛ تحلیل ناقص ماند.",
  timeout: "زمان تحلیل تمام شد. دوباره امتحان کنید یا پرامپت دستی بسازید.",
  invalid_output: "مدل نتیجه‌ی معتبر نداد.",
  no_answer: "مدل به نتیجه نرسید.",
  provider_error: "فراخوانی مدل شکست خورد.",
};

export async function POST(_req: NextRequest, { params }: Params) {
  const user = await getDevApiUser("api/dev/tasks/id/analyze-code");
  if (!user) return devNotFoundResponse();

  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400, headers: NO_STORE });

  let config, codeConfig;
  try {
    config = getAiConfig();
    codeConfig = getCodeConfig();
  } catch (error) {
    const name = error instanceof AiConfigError ? "AiConfigError" : "ConfigError";
    console.error("analyze-code config error:", name);
    return NextResponse.json({ error: "تنظیمات هوش مصنوعی یا دسترسی به کد نامعتبر است" }, { status: 503, headers: NO_STORE });
  }
  if (!config.enabled) return NextResponse.json({ error: "هوش مصنوعی خاموش است (AI_ENABLED)" }, { status: 503, headers: NO_STORE });
  if (!codeConfig) {
    return NextResponse.json({ error: "دسترسی به کد تنظیم نشده (GITHUB_READ_TOKEN و GITHUB_REPO)" }, { status: 503, headers: NO_STORE });
  }

  try {
    const detail = await loadTaskDetail(id);
    if (!detail) return NextResponse.json({ error: "تسک یافت نشد" }, { status: 404, headers: NO_STORE });

    // Two clicks / two tabs must not run two paid analyses at once.
    const recent = await db.execute(sql`
      SELECT 1 FROM ai_analysis_runs WHERE task_id = ${id} AND created_at > localtimestamp - interval '90 seconds' LIMIT 1`);
    if (recent.rows.length > 0) {
      return NextResponse.json({ error: "برای این تسک همین الان تحلیلی در جریان است؛ کمی صبر کنید." }, { status: 429, headers: NO_STORE });
    }

    await ensureBudgetRow(config.monthlyCapUsd);
    const model = config.deepModel || config.triageModel;
    const persistRun = async (log: RunLog) => {
      const [run] = await db
        .insert(aiAnalysisRuns)
        .values({ taskId: id, model: log.model, inputTokens: log.inputTokens, outputTokens: log.outputTokens, costUsd: log.cost.toFixed(6) })
        .returning({ id: aiAnalysisRuns.id });
      if (log.toolCalls.length > 0) {
        await db.insert(aiToolCalls).values(
          log.toolCalls.map((c) => ({ runId: run.id, toolName: c.name.slice(0, 100), argsHash: c.argsHash, allowed: c.allowed })),
        );
      }
    };

    try {
      const out = await analyzeTaskWithCode({
        task: detail.task,
        sources: detail.sources,
        provider: getProvider(config),
        model,
        maxOutputTokens: config.maxOutputTokens,
        reader: createGithubReader(codeConfig),
        persistRun,
      });
      const text = composeSuggestedFix(out.analysis, out.droppedEvidence, detail.task.suggestedFix, new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC");
      await db.update(aiTasks).set({ suggestedFix: text, updatedAt: sql`localtimestamp` }).where(eq(aiTasks.id, id));
      auditLog("dev_task_code_analysis", { userId: user.userId, taskId: id, steps: out.steps, reads: out.reads, costUsd: Number(out.costUsd.toFixed(6)) });
      return NextResponse.json({ ok: true, steps: out.steps, reads: out.reads, costUsd: out.costUsd, filesRead: out.filesRead }, { headers: NO_STORE });
    } catch (error) {
      if (error instanceof CodeAnalysisError) {
        auditLog("dev_task_code_analysis", { userId: user.userId, taskId: id, failure: error.code });
        return NextResponse.json({ error: FAILURE_TEXT[error.code] ?? "تحلیل انجام نشد", code: error.code }, { status: 502, headers: NO_STORE });
      }
      throw error;
    }
  } catch (error) {
    console.error("analyze-code error:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500, headers: NO_STORE });
  }
}
