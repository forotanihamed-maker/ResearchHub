import { NextResponse } from "next/server";
import { auditLog } from "@/lib/auditLog";
import { getAuthUser } from "@/lib/auth";
import { createIssueReportWithRateLimit } from "@/lib/reportRateLimit";

const CATEGORIES = ["فنی", "رابط کاربری", "محتوا", "پیشنهاد", "سایر"] as const;
type Category = (typeof CATEGORIES)[number];

export function validateReportInput(body: unknown):
  | { ok: true; value: { pagePath: string; description: string; category?: Category } }
  | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "بدنه درخواست نامعتبر است" };
  const value = body as Record<string, unknown>;
  if (typeof value.pagePath !== "string") return { ok: false, error: "مسیر صفحه نامعتبر است" };
  const pagePath = value.pagePath.trim();
  if (!pagePath.startsWith("/") || pagePath.length > 500) return { ok: false, error: "مسیر صفحه نامعتبر است" };
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

  let body: unknown;
  try { body = await req.json(); }
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
