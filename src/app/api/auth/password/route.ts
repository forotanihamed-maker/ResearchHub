/*src\app\api\auth\password\route.ts*/
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser, comparePassword, hashPassword } from "@/lib/auth";
import { isValidPassword, PASSWORD_MIN } from "@/lib/validation";
import { auditLog } from "@/lib/auditLog";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Deliberately separate from PATCH /api/auth/me: password changes are a
// more sensitive operation (require re-proving the current password) and
// benefit from their own rate limit, independent of ordinary profile edits.

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_USER = 5;

export async function PATCH(req: Request) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rateLimitKey = `password_change:${authUser.userId}`;
    const rateCheck = checkRateLimit(rateLimitKey, MAX_ATTEMPTS_PER_USER, WINDOW_MS);

    if (!rateCheck.allowed) {
      const retryAfterSec = Math.ceil((rateCheck.resetAt - Date.now()) / 1000);
      auditLog("password_change_rate_limited", { userId: authUser.userId, ip });
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
    }

    const { currentPassword, newPassword } = body;

    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "Current and new password are required" },
        { status: 400 }
      );
    }

    if (!isValidPassword(newPassword)) {
      return NextResponse.json(
        { error: `New password must be at least ${PASSWORD_MIN} characters` },
        { status: 400 }
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: "New password must be different from the current password" },
        { status: 400 }
      );
    }

    const [user] = await db
      .select({ id: users.id, password: users.password })
      .from(users)
      .where(eq(users.id, authUser.userId));

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) {
      auditLog("password_change_failed", {
        userId: authUser.userId,
        ip,
        reason: "bad_current_password",
      });
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    const newHash = await hashPassword(newPassword);

    await db
      .update(users)
      .set({ password: newHash, updatedAt: new Date() })
      .where(eq(users.id, authUser.userId));

    auditLog("password_changed", { userId: authUser.userId, ip });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("PATCH /api/auth/password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
