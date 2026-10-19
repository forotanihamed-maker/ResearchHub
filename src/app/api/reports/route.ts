import { NextResponse } from "next/server";
import { auditLog } from "@/lib/auditLog";
import { getAuthUser } from "@/lib/auth";
import { sanitizeSensitiveText } from "@/lib/errorCapture";
import { createIssueReportWithRateLimit } from "@/lib/reportRateLimit";

const MAX_BODY_BYTES = 16 * 1024;

const CATEGORIES = ["فنی", "رابط کاربری", "محتوا", "پیشنهاد", "سایر"] as const;
type Category = (typeof CATEGORIES)[number];

export function validateReportInput(body: unknown):
  | { ok: true; value: { pagePath: string; description: string; category?: Category } }
  | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "بدنه درخواست نامعتبر است" };
  const value = body as Record<string, unknown>;
  if (typeof value.pagePath !== "string") return { ok: false, error: "مسیر صفحه نامعتبر است" };
  const rawPath = value.pagePath.trim();
  if (!rawPath.startsWith("/") || rawPath.startsWith("//") || rawPath.length > 500) return { ok: false, error: "مسیر صفحه نامعتبر است" };
  // Paths can carry secrets (/invite/<token>, ?token=...): drop the query and
  // fragment and mask anything token-like before it is stored.
  const pagePath = sanitizeSensitiveText(rawPath.split(/[?#]/)[0]);
  if (typeof value.description !== "string") return { ok: false, error: "توضیح گزارش نامعتبر است" };
  const description = value.description.trim();
  if (description.length < 10 || description.length > 2000) return { ok: false, error: "توضیح باید بین ۱۰ تا ۲۰۰۰ کاراکتر باشد" };
  if (value.category !== undefined && value.category !== null) {
    if (typeof value.category !== "string" || !CATEGORIES.includes(value.category as Category)) {
      return { ok: false, error: "دسته‌بندی گزارش نامعتبر است" };
    }
    return { ok: true, value: { pagePath, description, category: value.category as Category } };
  }
  return { ok: true, value: { pagePath, description } };
}

export async function POST(req: Request) {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return NextResponse.json({ error: "حجم درخواست زیاد است" }, { status: 413 });
  let rawBody: string;
  try { rawBody = await req.text(); }
  catch { return NextResponse.json({ error: "بدنه درخواست نامعتبر است" }, { status: 400 }); }
  if (rawBody.length > MAX_BODY_BYTES) return NextResponse.json({ error: "حجم درخواست زیاد است" }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "بدنه درخواست JSON نامعتبر است" }, { status: 400 }); }

  const parsed = validateReportInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const result = await createIssueReportWithRateLimit({ userId: authUser.userId, ...parsed.value });
    if (!result.allowed) {
      auditLog("issue_report_rate_limited", { userId: authUser.userId });
      return NextResponse.json(
        { error: "تعداد گزارش‌های شما در یک ساعت اخیر به سقف مجاز رسیده است." },
        { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds) } }
      );
    }
    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/reports error", error instanceof Error ? error.name : "Error");
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
