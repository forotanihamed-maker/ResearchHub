import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { auditLog } from "@/lib/auditLog";
import { getAIConfig } from "@/lib/ai/provider";
import { triageSources } from "@/lib/ai/triage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return run(req);
}

export async function POST(req: Request) {
  return run(req);
}

async function run(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return new NextResponse(null, { status: 404 });
  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!safeEqual(provided, secret)) return new NextResponse(null, { status: 404 });

  try {
    const config = getAIConfig();
    if (!config.enabled) return NextResponse.json({ processed: 0, skipped: 0, errors: 0, costUsd: "0.000000", skippedReason: "disabled" });
    const result = await triageSources();
    auditLog("ai_triage_completed", { processed: result.processed, skipped: result.skipped, errors: result.errors, costUsd: result.costUsd });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    auditLog("ai_triage_error", { errorType: error instanceof Error ? error.name : "Error" });
    return NextResponse.json({ error: "اجرای پردازشگر هوش مصنوعی ناموفق بود" }, { status: 500 });
  }
}

function safeEqual(a: string, b: string): boolean {
  const ah = crypto.createHash("sha256").update(a).digest();
  const bh = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ah, bh);
}
