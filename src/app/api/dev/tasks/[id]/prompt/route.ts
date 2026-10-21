// GET /api/dev/tasks/:id/prompt — a ready-to-paste fix prompt for a coding assistant.
// Read-only, no model call, no cost. Dev panel only.
import { NextRequest, NextResponse } from "next/server";
import { buildFixPrompt } from "@/lib/ai/fixPrompt";
import { devNotFoundResponse, getDevApiUser } from "@/lib/devAccess";
import { loadTaskDetail } from "@/lib/devTaskDetail";
import { parseId } from "@/lib/validation";

export const dynamic = "force-dynamic";
const NO_STORE = { "Cache-Control": "no-store" };
type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getDevApiUser("api/dev/tasks/id/prompt");
  if (!user) return devNotFoundResponse();

  const id = parseId((await params).id);
  if (id === null) return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400, headers: NO_STORE });

  try {
    const detail = await loadTaskDetail(id);
    if (!detail) return NextResponse.json({ error: "تسک یافت نشد" }, { status: 404, headers: NO_STORE });
    return NextResponse.json({ prompt: buildFixPrompt(detail.task, detail.sources) }, { headers: NO_STORE });
  } catch (error) {
    console.error("Dev task prompt error:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500, headers: NO_STORE });
  }
}
