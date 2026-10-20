import crypto from "node:crypto";
import { db } from "@/db";
import { aiAnalysisRuns, aiTaskSources, aiTasks, aiToolCalls, errorEvents, issueReports } from "@/db/schema";
import { and, eq, notExists, desc } from "drizzle-orm";
import { auditLog } from "@/lib/auditLog";
import { getAIConfig, getAIProvider, type AIProvider, type ProviderResult } from "./provider";
import { maskForAI, maskPagePath } from "./mask";
import { buildErrorPrompt, buildReportPrompt, SUBMIT_TRIAGE_TOOL, TRIAGE_SYSTEM_PROMPT } from "./prompts";
import { adjustBudget, estimateCostUsd, estimateWorstCaseUsd, releaseBudget, reserveBudget } from "./budget";

const MAX_SOURCES = 20;
const MAX_RUNTIME_MS = 40_000;

export async function triageSources(): Promise<{ processed: number; skipped: number; errors: number; costUsd: string }> {
  const started = Date.now();
  const config = getAIConfig();
  if (!config.enabled) return { processed: 0, skipped: 0, errors: 0, costUsd: "0.000000" };
  if (config.provider === "deepseek" && !config.apiKey) throw new Error("DeepSeek provider is enabled but API key is missing");

  const reports = await db.select().from(issueReports).where(and(
    eq(issueReports.status, "new"),
    notExists(db.select({ id: aiTaskSources.id }).from(aiTaskSources).where(and(
      eq(aiTaskSources.sourceType, "report"), eq(aiTaskSources.sourceId, issueReports.id)
    )))
  )).orderBy(issueReports.createdAt).limit(MAX_SOURCES);

  const remaining = Math.max(0, MAX_SOURCES - reports.length);
  const errors = remaining > 0 ? await db.select().from(errorEvents).where(notExists(
    db.select({ id: aiTaskSources.id }).from(aiTaskSources).where(and(
      eq(aiTaskSources.sourceType, "error"), eq(aiTaskSources.sourceId, errorEvents.id)
    ))
  )).orderBy(desc(errorEvents.count), desc(errorEvents.lastSeenAt)).limit(remaining) : [];

  let processed = 0, skipped = 0, failures = 0, totalCost = 0;
  for (const source of reports) {
    if (Date.now() - started > MAX_RUNTIME_MS) break;
    try { const r = await processReport(source); r.processed ? processed++ : skipped++; totalCost += Number(r.costUsd); }
    catch (error) { failures++; auditLog("ai_triage_error", { sourceType: "report", sourceId: source.id, errorType: error instanceof Error ? error.name : "Error" }); }
  }
  for (const source of errors) {
    if (Date.now() - started > MAX_RUNTIME_MS) break;
    try { const r = await processError(source); r.processed ? processed++ : skipped++; totalCost += Number(r.costUsd); }
    catch (error) { failures++; auditLog("ai_triage_error", { sourceType: "error", sourceId: source.id, errorType: error instanceof Error ? error.name : "Error" }); }
  }
  return { processed, skipped, errors: failures, costUsd: totalCost.toFixed(6) };
}

async function processReport(source: typeof issueReports.$inferSelect) {
  const prompt = buildReportPrompt({ sourceId: source.id, pagePath: maskPagePath(source.pagePath), description: maskForAI(source.description), category: source.category });
  return processSource("report", source.id, prompt);
}

async function processError(source: typeof errorEvents.$inferSelect) {
  const prompt = buildErrorPrompt({
    sourceId: source.id,
    route: maskForAI(source.route, 255),
    message: maskForAI(source.message),
    count: source.count,
    lastSeenAt: source.lastSeenAt.toISOString(),
    stack: source.stackHash ? `[STACK_HASH:${source.stackHash}]` : undefined,
  });
  return processSource("error", source.id, prompt);
}

async function processSource(sourceType: "report" | "error", sourceId: number, prompt: string) {
  const config = getAIConfig();
  const provider = await getAIProvider();
  const first = await runProviderCall(provider, config.triageModel, prompt, sourceType, sourceId);
  if (!first) return { processed: false, costUsd: "0.000000" };
  const runIds = [first.runId];
  let totalCost = Number(first.costUsd);
  let output = validateTriage(first.result.toolArgs);

  if (!output) {
    const retry = await runProviderCall(provider, config.triageModel, `${prompt}\n\nخروجی قبلی نامعتبر بود؛ فقط submit_triage معتبر را برگردان.`, sourceType, sourceId);
    if (retry) { runIds.push(retry.runId); totalCost += Number(retry.costUsd); output = validateTriage(retry.result.toolArgs); }
  }

  if (!output) {
    const fallback = {
      title: "بررسی دستی لازم است",
      summary: "پاسخ مدل قابل‌استفاده نبود؛ بررسی دستی لازم است",
      severity: "medium" as const,
      category: "needs_human",
      suggestedFix: "بررسی دستی",
      confidence: null,
    };
    const task = await createTask(sourceType, sourceId, fallback, true);
    await linkRunsToTask(task.id, runIds);
    return { processed: task.created, costUsd: totalCost.toFixed(6) };
  }

  // High/critical findings get one second-pass review with the stronger model.
  if ((output.severity === "high" || output.severity === "critical") && config.deepModel !== config.triageModel) {
    const deep = await runProviderCall(provider, config.deepModel, `${prompt}\n\nاین مورد در ارزیابی اولیه high/critical بوده است. با همان شواهد، فقط در صورت وجود شاهد کافی شدت را تأیید یا اصلاح کن.`, sourceType, sourceId);
    if (deep) { runIds.push(deep.runId); totalCost += Number(deep.costUsd); const deepOutput = validateTriage(deep.result.toolArgs); if (deepOutput) output = deepOutput; }
  }

  const task = await createTask(sourceType, sourceId, output, false);
  if (!task.created) return { processed: false, costUsd: totalCost.toFixed(6) };
  await linkRunsToTask(task.id, runIds);
  return { processed: true, costUsd: totalCost.toFixed(6) };
}

interface ProviderRun {
  runId: number;
  result: ProviderResult;
  costUsd: string;
}

async function runProviderCall(provider: AIProvider, model: string, user: string, sourceType: "report" | "error", sourceId: number): Promise<ProviderRun | null> {
  const estimate = estimateWorstCaseUsd(model, Math.max(1, Math.ceil(user.length / 3)));
  const reservation = await reserveBudget(estimate);
  if (!reservation.allowed) {
    auditLog("ai_budget_blocked", { sourceType, sourceId, model });
    return null;
  }

  let result: ProviderResult;
  try {
    result = await provider.complete({ model, system: TRIAGE_SYSTEM_PROMPT, user, tool: SUBMIT_TRIAGE_TOOL });
  } catch (error) {
    await releaseBudget(reservation.month, reservation.reservedUsd);
    throw error;
  }

  const costUsd = estimateCostUsd(model, result.inputTokens, result.outputTokens);
  await adjustBudget(reservation.month, reservation.reservedUsd, costUsd);
  const [run] = await db.insert(aiAnalysisRuns).values({ taskId: null, model, inputTokens: result.inputTokens, outputTokens: result.outputTokens, costUsd }).returning({ id: aiAnalysisRuns.id });
  const argsHash = crypto.createHash("sha256").update(JSON.stringify(result.toolArgs)).digest("hex");
  const allowed = result.toolName === SUBMIT_TRIAGE_TOOL.name;
  await db.insert(aiToolCalls).values({ runId: run.id, toolName: result.toolName.slice(0, 100), argsHash, allowed });
  if (!allowed) auditLog("ai_tool_call_rejected", { runId: run.id, toolName: result.toolName.slice(0, 100) });
  return { runId: run.id, result, costUsd };
}

async function linkRunsToTask(taskId: number, runIds: number[]) {
  for (const runId of runIds) await db.update(aiAnalysisRuns).set({ taskId }).where(eq(aiAnalysisRuns.id, runId));
}

interface TriageOutput {
  title: string;
  summary: string;
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  suggestedFix: string;
  confidence: number | null;
  needsHuman: boolean;
  evidence: string[];
}

function validateTriage(value: unknown): TriageOutput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  const severities = ["low", "medium", "high", "critical"];
  const categories = ["authentication", "authorization", "project", "ui", "data", "performance", "security", "infrastructure", "needs_human"];
  if (typeof v.title !== "string" || v.title.length < 1 || v.title.length > 255) return null;
  if (typeof v.summary !== "string" || v.summary.length < 1 || v.summary.length > 2000) return null;
  if (typeof v.severity !== "string" || !severities.includes(v.severity)) return null;
  if (typeof v.category !== "string" || !categories.includes(v.category)) return null;
  if (typeof v.suggestedFix !== "string" || v.suggestedFix.length > 2000) return null;
  if (v.confidence !== null && (typeof v.confidence !== "number" || !Number.isFinite(v.confidence) || v.confidence < 0 || v.confidence > 1)) return null;
  if (typeof v.needsHuman !== "boolean" || !Array.isArray(v.evidence) || v.evidence.length > 8 || !v.evidence.every((x) => typeof x === "string" && x.length <= 500)) return null;
  return {
    title: maskForAI(v.title, 255), summary: maskForAI(v.summary, 2000), severity: v.severity as TriageOutput["severity"],
    category: v.category, suggestedFix: maskForAI(v.suggestedFix, 2000), confidence: v.confidence as number | null,
    needsHuman: v.needsHuman, evidence: (v.evidence as string[]).map((x) => maskForAI(x, 500)),
  };
}

async function createTask(sourceType: "report" | "error", sourceId: number, result: Pick<TriageOutput, "title" | "summary" | "severity" | "category" | "suggestedFix" | "confidence">, fallback: boolean) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: aiTaskSources.id }).from(aiTaskSources).where(and(eq(aiTaskSources.sourceType, sourceType), eq(aiTaskSources.sourceId, sourceId))).limit(1);
    if (existing) return { id: 0, created: false };
    try {
      const [task] = await tx.insert(aiTasks).values({ title: result.title, summary: result.summary, severity: result.severity, category: result.category, suggestedFix: result.suggestedFix, confidence: result.confidence }).returning({ id: aiTasks.id });
      await tx.insert(aiTaskSources).values({ taskId: task.id, sourceType, sourceId });
      if (sourceType === "report") await tx.update(issueReports).set({ status: "triaged" }).where(eq(issueReports.id, sourceId));
      auditLog("ai_task_created", { taskId: task.id, sourceType, sourceId, fallback });
      return { id: task.id, created: true };
    } catch (error) {
      // A concurrent cron may have won the unique source link. Treat it as an idempotent skip.
      if (isUniqueViolation(error)) return { id: 0, created: false };
      throw error;
    }
  });
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: unknown }).code === "23505");
}
