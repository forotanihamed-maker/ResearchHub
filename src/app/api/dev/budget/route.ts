// GET   /api/dev/budget — this month's AI spend, cap and kill switch
// PATCH /api/dev/budget — body {killSwitch: boolean}; nothing else is changeable here
// (the cap is changed with scripts/ai-budget.mjs, on purpose: not from a web page).
import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { aiAnalysisRuns } from "@/db/schema";
import { getAiConfig } from "@/lib/ai/provider";
import { ensureBudgetRow, getBudgetStatus, setKillSwitch } from "@/lib/ai/budget";
import { auditLog } from "@/lib/auditLog";
import { devNotFoundResponse, getDevApiUser } from "@/lib/devAccess";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };

async function snapshot() {
  const cap = getAiConfig().monthlyCapUsd;
  await ensureBudgetRow(cap);
  const status = await getBudgetStatus();
  const [runs] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(aiAnalysisRuns)
    .where(sql`to_char(${aiAnalysisRuns.createdAt}, 'YYYY-MM') = to_char(localtimestamp, 'YYYY-MM')`);
  return { budget: status, runsThisMonth: runs?.n ?? 0, enabled: getAiConfig().enabled };
}

export async function GET() {
  const user = await getDevApiUser("api/dev/budget");
  if (!user) return devNotFoundResponse();
  try {
    return NextResponse.json(await snapshot(), { headers: NO_STORE });
  } catch (error) {
    console.error("Dev budget GET error:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500, headers: NO_STORE });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getDevApiUser("api/dev/budget");
  if (!user) return devNotFoundResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "بدنه‌ی درخواست نامعتبر است" }, { status: 400, headers: NO_STORE });
  }
  const kill = (body as { killSwitch?: unknown } | null)?.killSwitch;
  if (typeof kill !== "boolean") {
    return NextResponse.json({ error: "killSwitch باید true یا false باشد" }, { status: 400, headers: NO_STORE });
  }
  try {
    await setKillSwitch(kill, getAiConfig().monthlyCapUsd);
    auditLog("ai_kill_switch_changed", { userId: user.userId, killSwitch: kill });
    return NextResponse.json(await snapshot(), { headers: NO_STORE });
  } catch (error) {
    console.error("Dev budget PATCH error:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500, headers: NO_STORE });
  }
}
