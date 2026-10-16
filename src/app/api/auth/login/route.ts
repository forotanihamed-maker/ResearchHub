/*src\app\api\auth\login\route.ts*/
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { comparePassword, signToken } from "@/lib/auth";
import {
  startAttempt,
  clearFailures,
  getClientIp,
  type AttemptGuard,
} from "@/lib/rateLimit";
import { auditLog } from "@/lib/auditLog";

// ---------------------------------------------------------------------------
// Login rate limiting — counts FAILED authentication attempts only.
//
//  • Per email:  MAX_FAILED_PER_EMAIL failures per WINDOW_MS (fixed: 5).
//  • Per IP:     MAX_FAILED_PER_IP failures per WINDOW_MS.
//      Default 100, override with the env var LOGIN_MAX_FAILED_ATTEMPTS_PER_IP
//      (positive integer; anything else falls back to the default).
//      The default is deliberately generous: students and professors of one
//      college may all reach the app through the SAME public IP (campus NAT),
//      so a small per-IP number would lock everybody out after a few typos.
//      Lower it only once you know how users really connect.
//  • A successful login NEVER clears the IP counter (otherwise any attacker
//      with one valid account could reset it at will). It only clears the
//      email counter of the account that just proved its password.
//  • Concurrency: see startAttempt() in lib/rateLimit.ts — a slot is reserved
//      in the same synchronous step as the check, so parallel requests cannot
//      all slip past the limit while the slow bcrypt comparison is running.
//      Side effect: more than <limit> truly simultaneous logins on one key
//      get a 429 immediately (with the defaults: >5 at once for one email,
//      >100 at once for one IP).
//
// ⚠️ Limitation (unchanged by this code): counters live in the memory of one
// serverless instance. They are not shared between Vercel instances and reset
// on cold starts, so the real ceiling is "limit × number of warm instances".
// ---------------------------------------------------------------------------
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_PER_EMAIL = 5;
const DEFAULT_MAX_FAILED_PER_IP = 100;
const MAX_EMAIL_LENGTH = 254; // RFC 5321 maximum for an address
const MAX_IP_KEY_LENGTH = 64;

function readPositiveIntEnv(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return raw !== undefined && Number.isInteger(n) && n > 0 ? n : fallback;
}

const MAX_FAILED_PER_IP = readPositiveIntEnv(
  process.env.LOGIN_MAX_FAILED_ATTEMPTS_PER_IP,
  DEFAULT_MAX_FAILED_PER_IP
);

export async function POST(req: NextRequest) {
  let ipGuard: AttemptGuard | null = null;
  let emailGuard: AttemptGuard | null = null;

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "بدنه درخواست JSON نامعتبر است" },
        { status: 400 }
      );
    }
    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "ایمیل و رمز عبور الزامی است" },
        { status: 400 }
      );
    }

    const { email, password } = body as Record<string, unknown>;

    if (!email || !password) {
      return NextResponse.json(
        { error: "ایمیل و رمز عبور الزامی است" },
        { status: 400 }
      );
    }

    // Validate BEFORE anything derived from the input is used as a limiter key.
    if (typeof email !== "string") {
      return NextResponse.json({ error: "ایمیل نامعتبر است" }, { status: 400 });
    }
    if (typeof password !== "string") {
      return NextResponse.json(
        { error: "رمز عبور نامعتبر است" },
        { status: 400 }
      );
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || normalizedEmail.length > MAX_EMAIL_LENGTH) {
      return NextResponse.json({ error: "ایمیل نامعتبر است" }, { status: 400 });
    }

    const ip = getClientIp(req).slice(0, MAX_IP_KEY_LENGTH);
    const emailKey = `login:email:${normalizedEmail}`;
    const ipKey = `login:ip:${ip}`;

    // Check + reserve in one synchronous step per key (no await in between).
    ipGuard = startAttempt(ipKey, MAX_FAILED_PER_IP, WINDOW_MS);
    emailGuard = startAttempt(emailKey, MAX_FAILED_PER_EMAIL, WINDOW_MS);

    if (!ipGuard.allowed || !emailGuard.allowed) {
      // The `finally` below frees whichever slot was reserved.
      const resetAt = Math.max(
        ipGuard.allowed ? 0 : ipGuard.resetAt,
        emailGuard.allowed ? 0 : emailGuard.resetAt
      );
      const retryAfterSec = Math.max(
        1,
        Math.ceil((resetAt - Date.now()) / 1000)
      );
      auditLog("login_rate_limited", { email: normalizedEmail, ip });
      return NextResponse.json(
        {
          error:
            "تعداد تلاش‌های ورود بیش از حد مجاز است. لطفاً بعداً دوباره تلاش کنید.",
        },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (!user) {
      ipGuard.fail();
      emailGuard.fail();
      auditLog("login_failed", {
        email: normalizedEmail,
        ip,
        reason: "no_such_user",
      });
      return NextResponse.json(
        { error: "ایمیل یا رمز عبور نادرست است" },
        { status: 401 }
      );
    }

    const valid = await comparePassword(password, user.password);

    if (!valid) {
      ipGuard.fail();
      emailGuard.fail();
      auditLog("login_failed", {
        email: normalizedEmail,
        ip,
        reason: "bad_password",
        userId: user.id,
      });
      return NextResponse.json(
        { error: "ایمیل یا رمز عبور نادرست است" },
        { status: 401 }
      );
    }

    // Credentials are correct: this attempt is not a failure for the limiter.
    ipGuard.done();
    emailGuard.done();

    if (user.role === "professor" && user.professorStatus !== "approved") {
      const isPending = user.professorStatus === "pending";
      auditLog(
        isPending ? "professor_pending_login" : "professor_rejected_login",
        {
          userId: user.id,
          email: user.email,
          ip,
          professorStatus: user.professorStatus,
        }
      );

      return NextResponse.json(
        {
          error: isPending
            ? "حساب استاد شما در انتظار تأیید مدیر است."
            : "حساب استاد شما رد شده است.",
        },
        { status: 403 }
      );
    }

    // Only the email counter of the account that just proved its password is
    // cleared. The IP counter is intentionally left alone.
    clearFailures(emailKey);
    auditLog("login_success", { userId: user.id, email: user.email, ip });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    const { password: _pwd, ...safeUser } = user;
    const response = NextResponse.json({ user: safeUser, token });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  } finally {
    // No-ops if fail()/done() already ran. Guarantees a reserved slot is never
    // leaked on an early return or an exception (e.g. a database error), and
    // that such cases are not counted as failed logins.
    ipGuard?.done();
    emailGuard?.done();
  }
}
