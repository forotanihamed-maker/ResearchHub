// src/app/api/cron/triage/route.ts
//
// Called by a scheduler (GitHub Actions). Fails closed: with no CRON_SECRET
// configured, every request is refused. The response carries counts only,
// never report text.
import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auditLog } from "@/lib/auditLog";
import { AiConfigError, getAiConfig } from "@/lib/ai/provider";
import { runTriage } from "@/lib/ai/triage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function isAuthorizedCron(request: NextRequest, secret = process.env.CRON_SECRET): boolean {
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) return false;
  return timingSafeEqual(digest(match[1]), digest(secret));
}

async function handle(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    auditLog("ai_cron_denied", { path: "/api/cron/triage" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    if (!getAiConfig().enabled) {
      return NextResponse.json({ ok: true, skipped: "disabled" });
    }
    const summary = await runTriage();
    auditLog("ai_triage_run", { ...summary });
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    // Never echo error text: it could contain provider or DB details.
    const kind = error instanceof AiConfigError ? "config" : "internal";
    console.error("[ai-triage] failed:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ ok: false, error: kind }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
