// GET /api/dev/tasks — list AI tasks (dev panel only). Most severe first.
import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiTasks } from "@/db/schema";
import { devNotFoundResponse, getDevApiUser } from "@/lib/devAccess";
import { PAGE_SIZE, parseTaskListQuery } from "@/lib/devTasks";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: NextRequest) {
  const user = await getDevApiUser("api/dev/tasks");
  if (!user) return devNotFoundResponse();

  try {
    const q = parseTaskListQuery(request.nextUrl.searchParams);
    const where = and(
      q.status ? eq(aiTasks.status, q.status) : undefined,
      q.severity ? eq(aiTasks.severity, q.severity) : undefined
    );

    const rows = await db
      .select({
        id: aiTasks.id,
        title: aiTasks.title,
        severity: aiTasks.severity,
        category: aiTasks.category,
        status: aiTasks.status,
        confidence: aiTasks.confidence,
        createdAt: sql<string>`to_char(${aiTasks.createdAt}, 'YYYY-MM-DD HH24:MI')`,
      })
      .from(aiTasks)
      .where(where)
      .orderBy(
        sql`CASE ${aiTasks.severity} WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`,
        sql`${aiTasks.createdAt} DESC`,
        sql`${aiTasks.id} DESC`
      )
      .limit(PAGE_SIZE + 1)
      .offset((q.page - 1) * PAGE_SIZE);

    const counts = await db
      .select({ status: aiTasks.status, n: sql<number>`count(*)::int` })
      .from(aiTasks)
      .groupBy(aiTasks.status);

    return NextResponse.json(
      {
        tasks: rows.slice(0, PAGE_SIZE),
        hasMore: rows.length > PAGE_SIZE,
        page: q.page,
        counts: Object.fromEntries(counts.map((c) => [c.status, c.n])),
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    console.error("Dev tasks list error:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500, headers: NO_STORE });
  }
}
