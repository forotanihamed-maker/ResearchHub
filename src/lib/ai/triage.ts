// src/lib/ai/triage.ts
//
// Turns new reports / error events into ai_tasks. Guarantees:
// - the model sees only masked text and may only call submit_triage;
// - every model tool call is logged (ai_tool_calls), allowed or not;
// - spend is reserved atomically before each call and reconciled after;
// - a source becomes a task at most once (unique index + advisory lock);
// - task, source link and report status change in ONE transaction.
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db, pool } from "@/db";
import { aiAnalysisRuns, aiTaskSources, aiTasks, aiToolCalls, issueReports } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  AiConfigError,
  AiProviderError,
  getAiConfig,
  getProvider,
  type AiConfig,
  type AiProvider,
  type CompletionResult,
} from "@/lib/ai/provider";
import {
  SYSTEM_PROMPT,
  TRIAGE_TOOL,
  TRIAGE_TOOL_NAME,
  buildErrorPrompt,
  buildReportPrompt,
} from "@/lib/ai/prompts";
import { explainTriageFailure, validateTriage, type TriageResult } from "@/lib/ai/validate";
import { costUsd, ensureBudgetRow, estimateInputTokens, reserve, settle } from "@/lib/ai/budget";

const LOCK_KEY = 6_000_001; // arbitrary app-wide advisory-lock id for the triage job

export interface TriageSummary {
  skipped?: "disabled" | "locked" | "no_budget";
  processed: number;
  created: number;
  needsHuman: number;
  failed: number;
  escalated: number;
  budgetExhausted: boolean;
  costUsd: number;
  /** HTTP status of the last provider failure (null = network/timeout). Never a body. */
  lastProviderStatus?: number | null;
  /** Why the last model answer was rejected (field/flag names only, never content). */
  lastInvalidReason?: string;
}

interface RunRecord {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  toolCalls: Array<{ name: string; argsHash: string; allowed: boolean }>;
}

type Source =
  | { type: "report"; id: number; prompt: string }
  | { type: "error"; id: number; prompt: string };

let lastInvalidReason: string | undefined;

class SkipSource extends Error {}
class BudgetExhausted extends Error {}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** One model call with budget reservation. Throws BudgetExhausted / AiProviderError. */
async function callModel(
  provider: AiProvider,
  model: string,
  user: string,
  records: RunRecord[],
  maxOutputTokens: number
): Promise<{ result: CompletionResult; triage: TriageResult | null }> {
  const est = costUsd(model, estimateInputTokens(SYSTEM_PROMPT, user), maxOutputTokens);
  if (!(await reserve(est))) throw new BudgetExhausted();

  let result: CompletionResult;
  try {
    result = await provider.complete({
      model,
      system: SYSTEM_PROMPT,
      user,
      tool: TRIAGE_TOOL,
      maxOutputTokens,
    });
  } catch (error) {
    await settle(est, 0); // nothing was billed for a failed call
    throw error;
  }

  const actual = costUsd(model, result.inputTokens, result.outputTokens);
  await settle(est, actual);
  records.push({
    model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    cost: actual,
    toolCalls: result.toolCalls.map((c) => ({
      name: c.name,
      argsHash: sha(c.argumentsJson),
      allowed: c.name === TRIAGE_TOOL_NAME,
    })),
  });

  // Only the allowed tool is considered; anything else is ignored (and logged above).
  const allowed = result.toolCalls.find((c) => c.name === TRIAGE_TOOL_NAME);
  const triage = allowed ? validateTriage(allowed.argumentsJson) : null;
  if (!triage) {
    const reason = `${explainTriageFailure(allowed?.argumentsJson)}; finish=${result.finishReason ?? "?"}; text=${result.hadText ? "yes" : "no"}; tools=${result.toolCalls.length}; out_tokens=${result.outputTokens}`;
    lastInvalidReason = reason;
    console.warn("[ai-triage] invalid model output:", reason);
  }
  return { result, triage };
}

function needsHumanTask(): TriageResult {
  return {
    title: "نیازمند بررسی انسانی",
    summary: "تحلیل خودکار نتیجه‌ی معتبر نداد؛ این مورد باید دستی بررسی شود.",
    severity: "medium",
    category: "needs_human",
    suggestedFix: null,
    confidence: 0,
    needsHuman: true,
    evidence: [],
  };
}

async function persistRuns(tx: Pick<typeof db, "insert">, taskId: number | null, records: RunRecord[]) {
  for (const r of records) {
    const [run] = await tx
      .insert(aiAnalysisRuns)
      .values({
        taskId,
        model: r.model,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        costUsd: r.cost.toFixed(6),
      })
      .returning({ id: aiAnalysisRuns.id });
    if (r.toolCalls.length > 0) {
      await tx.insert(aiToolCalls).values(
        r.toolCalls.map((c) => ({
          runId: run.id,
          toolName: c.name.slice(0, 100),
          argsHash: c.argsHash,
          allowed: c.allowed,
        }))
      );
    }
  }
}

async function saveTask(source: Source, t: TriageResult, records: RunRecord[]): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      const [task] = await tx
        .insert(aiTasks)
        .values({
          title: t.title,
          summary: t.summary,
          severity: t.severity,
          category: t.category,
          suggestedFix: t.suggestedFix,
          confidence: t.needsHuman && t.confidence === 0 ? null : t.confidence,
        })
        .returning({ id: aiTasks.id });
      const linked = await tx
        .insert(aiTaskSources)
        .values({ taskId: task.id, sourceType: source.type, sourceId: source.id })
        .onConflictDoNothing()
        .returning({ id: aiTaskSources.id });
      if (linked.length === 0) throw new SkipSource(); // someone else got there first: roll back
      if (source.type === "report") {
        await tx.update(issueReports).set({ status: "triaged" }).where(eq(issueReports.id, source.id));
      }
      await persistRuns(tx, task.id, records);
    });
  } catch (error) {
    if (error instanceof SkipSource) {
      await persistRuns(db, null, records); // the money was spent; keep the record
    }
    throw error;
  }
}

async function loadSources(limit: number): Promise<Source[]> {
  const reports = await db.execute(sql`
    SELECT r.id, r.page_path, r.description, r.category
      FROM issue_reports r
     WHERE r.status = 'new'
       AND NOT EXISTS (SELECT 1 FROM ai_task_sources s WHERE s.source_type = 'report' AND s.source_id = r.id)
     ORDER BY r.created_at ASC, r.id ASC
     LIMIT ${limit}`);
  const out: Source[] = (reports.rows as Array<Record<string, unknown>>).map((r) => ({
    type: "report" as const,
    id: Number(r.id),
    prompt: buildReportPrompt({
      id: Number(r.id),
      pagePath: String(r.page_path),
      description: String(r.description),
      category: (r.category as string | null) ?? null,
    }),
  }));
  const room = limit - out.length;
  if (room > 0) {
    const errors = await db.execute(sql`
      SELECT e.id, e.source, e.route, e.message, e.count
        FROM error_events e
       WHERE e.last_seen_at > localtimestamp - interval '7 days'
         AND NOT EXISTS (SELECT 1 FROM ai_task_sources s WHERE s.source_type = 'error' AND s.source_id = e.id)
       ORDER BY e.count DESC, e.last_seen_at DESC, e.id DESC
       LIMIT ${room}`);
    for (const e of errors.rows as Array<Record<string, unknown>>) {
      out.push({
        type: "error",
        id: Number(e.id),
        prompt: buildErrorPrompt({
          id: Number(e.id),
          source: String(e.source),
          route: String(e.route),
          message: String(e.message),
          count: Number(e.count),
        }),
      });
    }
  }
  return out;
}

export interface TriageOptions {
  config?: AiConfig;
  provider?: AiProvider;
  /** Wall-clock budget for the whole run (serverless time limit guard). */
  timeBudgetMs?: number;
}

export async function runTriage(options: TriageOptions = {}): Promise<TriageSummary> {
  const config = options.config ?? getAiConfig();
  const summary: TriageSummary = {
    processed: 0, created: 0, needsHuman: 0, failed: 0, escalated: 0,
    budgetExhausted: false, costUsd: 0,
  };
  if (!config.enabled) return { ...summary, skipped: "disabled" };

  const provider = options.provider ?? getProvider(config); // throws AiConfigError if key missing
  lastInvalidReason = undefined;
  const deadline = Date.now() + (options.timeBudgetMs ?? 40_000);

  // One triage job at a time (second concurrent cron exits immediately).
  const lockClient = await pool.connect();
  try {
    const lock = await lockClient.query("SELECT pg_try_advisory_lock($1) AS ok", [LOCK_KEY]);
    if (!lock.rows[0]?.ok) return { ...summary, skipped: "locked" };
    try {
      await ensureBudgetRow(config.monthlyCapUsd);
      const sources = await loadSources(config.batchSize);
      let consecutiveProviderErrors = 0;

      for (const source of sources) {
        if (Date.now() > deadline) break;
        const records: RunRecord[] = [];
        try {
          let { triage } = await callModel(provider, config.triageModel, source.prompt, records, config.maxOutputTokens);
          if (!triage) {
            ({ triage } = await callModel(provider, config.triageModel, source.prompt, records, config.maxOutputTokens));
          }
          let final = triage;
          if (final && (final.severity === "high" || final.severity === "critical") &&
              !final.needsHuman && config.deepModel !== config.triageModel) {
            try {
              const deep = await callModel(provider, config.deepModel, source.prompt, records, config.maxOutputTokens);
              summary.escalated++;
              if (deep.triage) final = deep.triage;
            } catch (e) {
              if (!(e instanceof BudgetExhausted || e instanceof AiProviderError)) throw e;
              // keep the cheap result
            }
          }
          const toSave = final ?? needsHumanTask();
          await saveTask(source, toSave, records);
          summary.processed++;
          summary.created++;
          if (toSave.needsHuman) summary.needsHuman++;
          consecutiveProviderErrors = 0;
        } catch (error) {
          if (error instanceof SkipSource) { summary.processed++; continue; }
          if (error instanceof BudgetExhausted) {
            summary.budgetExhausted = true;
            if (records.length) await persistRuns(db, null, records);
            break;
          }
          if (error instanceof AiProviderError) {
            summary.failed++;
            summary.lastProviderStatus = error.status;
            console.warn("[ai-triage] provider failed:", error.message);
            if (records.length) await persistRuns(db, null, records);
            if (++consecutiveProviderErrors >= 3) break;
            continue;
          }
          throw error;
        } finally {
          summary.costUsd += records.reduce((n, r) => n + r.cost, 0);
        }
      }
    } finally {
      await lockClient.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
    }
  } finally {
    lockClient.release();
  }
  summary.costUsd = Number(summary.costUsd.toFixed(6));
  if (summary.needsHuman > 0 && lastInvalidReason) summary.lastInvalidReason = lastInvalidReason;
  return summary;
}

export { AiConfigError };
