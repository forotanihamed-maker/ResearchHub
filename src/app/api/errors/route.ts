import { NextResponse } from "next/server";
import { auditLog } from "@/lib/auditLog";
import { getAuthUser } from "@/lib/auth";
import { reportClientError } from "@/lib/errorCapture";
import { consumeClientErrorRateLimit } from "@/lib/reportRateLimit";

const MAX_BODY_BYTES = 8 * 1024;
const MAX_ROUTE_LENGTH = 255;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_STACK_LENGTH = 8000;

export function validateClientErrorInput(body: unknown):
  | { ok: true; value: { route: string; message: string; stack?: string } }
  | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "بدنه درخواست نامعتبر است" };
  const value = body as Record<string, unknown>;
  if (typeof value.route !== "string" || value.route.trim().length === 0 || value.route.length > MAX_ROUTE_LENGTH) return { ok: false, error: "مسیر خطا نامعتبر است" };
  if (typeof value.message !== "string" || value.message.trim().length === 0 || value.message.length > MAX_MESSAGE_LENGTH) return { ok: false, error: "پیام خطا نامعتبر است" };
  if (value.stack !== undefined && value.stack !== null && (typeof value.stack !== "string" || value.stack.length > MAX_STACK_LENGTH)) return { ok: false, error: "جزئیات خطا بیش از حد طولانی است" };
  return { ok: true, value: { route: value.route.trim(), message: value.message.trim(), stack: typeof value.stack === "string" ? value.stack : undefined } };
}

export async function POST(req: Request) {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return NextResponse.json({ error: "حجم گزارش خطا بیش از حد مجاز است" }, { status: 413 });

  let rawBody: string;
  try { rawBody = await req.text(); }
  catch { return NextResponse.json({ error: "خواندن گزارش خطا ناموفق بود" }, { status: 400 }); }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) return NextResponse.json({ error: "حجم گزارش خطا بیش از حد مجاز است" }, { status: 413 });

  let body: unknown;
  try { body = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "بدنه درخواست JSON نامعتبر است" }, { status: 400 }); }

  const parsed = validateClientErrorInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const rate = consumeClientErrorRateLimit(authUser.userId);
  if (!rate.allowed) {
    auditLog("browser_error_rate_limited", { userId: authUser.userId });
    return NextResponse.json(
      { error: "تعداد گزارش‌های خطا در یک ساعت اخیر به سقف مجاز رسیده است." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
    );
  }

  await reportClientError(parsed.value.route, parsed.value.message, parsed.value.stack);
  return NextResponse.json({ ok: true }, { status: 202 });
}
