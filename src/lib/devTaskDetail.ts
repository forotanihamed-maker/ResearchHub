// src/lib/devTaskDetail.ts
// Loads one task with its source text and analysis runs for the dev panel.
// Sources never join users: the panel (and any prompt built from it) must not
// reveal who wrote a report.
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiAnalysisRuns, aiTaskSources, aiTasks, errorEvents, issueReports } from "@/db/schema";

export interface DevTaskSource {
  type: "report" | "error";
  id: number;
  pagePath?: string;
  description?: string;
  category?: string | null;
  source?: string;
  route?: string;
  message?: string;
  count?: number;
  createdAt?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
}

export async function loadTaskDetail(id: number) {
  const [task] = await db
    .select({
      id: aiTasks.id,
      title: aiTasks.title,
      summary: aiTasks.summary,
      severity: aiTasks.severity,
      category: aiTasks.category,
      status: aiTasks.status,
      suggestedFix: aiTasks.suggestedFix,
      confidence: aiTasks.confidence,
      createdAt: sql<string>`to_char(${aiTasks.createdAt}, 'YYYY-MM-DD HH24:MI')`,
      updatedAt: sql<string>`to_char(${aiTasks.updatedAt}, 'YYYY-MM-DD HH24:MI')`,
    })
    .from(aiTasks)
    .where(eq(aiTasks.id, id));
  if (!task) return null;

  const links = await db
    .select({ type: aiTaskSources.sourceType, sourceId: aiTaskSources.sourceId })
    .from(aiTaskSources)
    .where(eq(aiTaskSources.taskId, id));

  const sources: DevTaskSource[] = [];
  for (const link of links) {
    if (link.type === "report") {
      const [r] = await db
        .select({
          pagePath: issueReports.pagePath,
          description: issueReports.description,
          category: issueReports.category,
          createdAt: sql<string>`to_char(${issueReports.createdAt}, 'YYYY-MM-DD HH24:MI')`,
        })
        .from(issueReports)
        .where(eq(issueReports.id, link.sourceId));
      sources.push({ type: "report", id: link.sourceId, ...(r ?? {}) });
    } else {
      const [e] = await db
        .select({
          source: errorEvents.source,
          route: errorEvents.route,
          message: errorEvents.message,
          count: errorEvents.count,
          firstSeenAt: sql<string>`to_char(${errorEvents.firstSeenAt}, 'YYYY-MM-DD HH24:MI')`,
          lastSeenAt: sql<string>`to_char(${errorEvents.lastSeenAt}, 'YYYY-MM-DD HH24:MI')`,
        })
        .from(errorEvents)
        .where(eq(errorEvents.id, link.sourceId));
      sources.push({ type: "error", id: link.sourceId, ...(e ?? {}) });
    }
  }

  const runs = await db
    .select({
      model: aiAnalysisRuns.model,
      inputTokens: aiAnalysisRuns.inputTokens,
      outputTokens: aiAnalysisRuns.outputTokens,
      costUsd: sql<number>`${aiAnalysisRuns.costUsd}::float8`,
    })
    .from(aiAnalysisRuns)
    .where(eq(aiAnalysisRuns.taskId, id));

  return { task, sources, runs };
}
