import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { comparePassword, signToken } from "@/lib/auth";
import { checkRateLimit, resetRateLimit, getClientIp } from "@/lib/rateLimit";
import { auditLog } from "@/lib/auditLog";

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS_PER_EMAIL = 5;
const MAX_ATTEMPTS_PER_IP = 20;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const ip = getClientIp(req);
    const emailKey = `login:email:${normalizedEmail}`;
    const ipKey = `login:ip:${ip}`;

    const ipCheck = checkRateLimit(ipKey, MAX_ATTEMPTS_PER_IP, WINDOW_MS);
    const emailCheck = checkRateLimit(
      emailKey,
      MAX_ATTEMPTS_PER_EMAIL,
      WINDOW_MS
    );

    if (!ipCheck.allowed || !emailCheck.allowed) {
      const retryAfterSec = Math.ceil(
        (Math.max(ipCheck.resetAt, emailCheck.resetAt) - Date.now()) / 1000
      );
      auditLog("login_rate_limited", { email: normalizedEmail, ip });
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (!user) {
      auditLog("login_failed", {
        email: normalizedEmail,
        ip,
        reason: "no_such_user",
      });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const valid = await comparePassword(password, user.password);

    if (!valid) {
      auditLog("login_failed", {
        email: normalizedEmail,
        ip,
        reason: "bad_password",
        userId: user.id,
      });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Successful login — clear the counters for this email/IP.
    resetRateLimit(emailKey);
    resetRateLimit(ipKey);
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
