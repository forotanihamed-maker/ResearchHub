// GET   /api/dev/tasks/:id — task, its source text and analysis runs
// PATCH /api/dev/tasks/:id — change status only (body: {status})
// Source rows deliberately do NOT join users: the panel never shows who wrote a report.
import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiAnalysisRuns, aiTaskSources, aiTasks, errorEvents, issueReports } from "@/db/schema";
import { auditLog } from "@/lib/auditLog";
import { devNotFoundResponse, getDevApiUser } from "@/lib/devAccess";
import { isTaskStatus } from "@/lib/devTasks";
import { parseId } from "@/lib/validation";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getDevApiUser("api/dev/tasks/id");
  if (!user) return devNotFoundResponse();

  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400, headers: NO_STORE });

  try {
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
    if (!task) return NextResponse.json({ error: "تسک یافت نشد" }, { status: 404, headers: NO_STORE });

    const links = await db
      .select({ type: aiTaskSources.sourceType, sourceId: aiTaskSources.sourceId })
      .from(aiTaskSources)
      .where(eq(aiTaskSources.taskId, id));

    const sources = [];
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
        sources.push({ type: "report" as const, id: link.sourceId, ...(r ?? null) });
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
        sources.push({ type: "error" as const, id: link.sourceId, ...(e ?? null) });
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

    return NextResponse.json({ task, sources, runs }, { headers: NO_STORE });
  } catch (error) {
    console.error("Dev task GET error:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500, headers: NO_STORE });
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const user = await getDevApiUser("api/dev/tasks/id");
  if (!user) return devNotFoundResponse();

  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400, headers: NO_STORE });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بدنه‌ی درخواست نامعتبر است" }, { status: 400, headers: NO_STORE });
  }
  const status = (body as { status?: unknown } | null)?.status;
  if (!isTaskStatus(status)) {
    return NextResponse.json({ error: "وضعیت نامعتبر است" }, { status: 400, headers: NO_STORE });
  }

  try {
    const updated = await db
      .update(aiTasks)
      .set({ status, updatedAt: sql`localtimestamp` })
      .where(eq(aiTasks.id, id))
      .returning({ id: aiTasks.id });
    if (updated.length === 0) {
      return NextResponse.json({ error: "تسک یافت نشد" }, { status: 404, headers: NO_STORE });
    }
    auditLog("dev_task_status_changed", { userId: user.userId, taskId: id, status });
    return NextResponse.json({ ok: true, status }, { headers: NO_STORE });
  } catch (error) {
    console.error("Dev task PATCH error:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500, headers: NO_STORE });
  }
}
