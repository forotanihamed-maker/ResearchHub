// src/lib/devAccess.ts
//
// Access control for the developer-assistant panel (/dashboard/dev/* and
// /api/dev/*). Deliberately NOT requireAdmin(): that only checks role ===
// "admin", and department admins must never reach this panel.
//
// Rules:
// - Allowed users are listed by e-mail in DEV_ADMIN_EMAILS (comma-separated,
//   case-insensitive). Unset or empty => nobody is allowed (fail closed).
// - Everybody else (logged out, student, professor, department admin, or an
//   admin who is not on the list) gets 404, not 403, so the panel's
//   existence is not advertised.
// - The user comes from getAuthUser(), which re-reads the account from the DB
//   on every call, so changing/deleting an account revokes access at once.
// - Every outcome is audit-logged. A denied entry never contains an e-mail.
import { notFound } from "next/navigation";
import { getAuthUser, type JWTPayload } from "@/lib/auth";
import { auditLog } from "@/lib/auditLog";

/** Parses a DEV_ADMIN_EMAILS value into trimmed, lower-cased addresses. */
export function parseDevAdminEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0)
  );
}

/** Pure check against an explicit list. Empty/unset list => false. */
export function isEmailInList(
  email: string | null | undefined,
  raw: string | undefined
): boolean {
  if (typeof email !== "string") return false;
  const allowed = parseDevAdminEmails(raw);
  if (allowed.size === 0) return false;
  return allowed.has(email.trim().toLowerCase());
}

/** Same check against the DEV_ADMIN_EMAILS environment variable. */
export function isDevAdminEmail(email: string | null | undefined): boolean {
  return isEmailInList(email, process.env.DEV_ADMIN_EMAILS);
}

type Decision =
  | { allowed: true; user: JWTPayload }
  | { allowed: false };

async function decide(where: string): Promise<Decision> {
  const user = await getAuthUser();

  if (!user) {
    auditLog("dev_panel_denied", { where, reason: "unauthenticated" });
    return { allowed: false };
  }

  if (!isDevAdminEmail(user.email)) {
    const configured =
      parseDevAdminEmails(process.env.DEV_ADMIN_EMAILS).size > 0;
    auditLog("dev_panel_denied", {
      where,
      reason: configured ? "not_allowed" : "not_configured",
      userId: user.userId,
      role: user.role,
    });
    return { allowed: false };
  }

  auditLog("dev_panel_access", { where, userId: user.userId });
  return { allowed: true, user };
}

/**
 * Guard for dev-panel PAGES and LAYOUTS. Returns the allowed user, or renders
 * the standard 404 (this call never returns in that case).
 * `where` is a short label for the audit log, e.g. "dashboard/dev/tasks".
 */
export async function requireDevPanelUser(where: string): Promise<JWTPayload> {
  const result = await decide(where);
  if (!result.allowed) notFound();
  return result.user;
}

/**
 * Guard for dev-panel API ROUTES. Returns the allowed user, or null; the
 * route must then return devNotFoundResponse(). Route handlers use an
 * explicit response instead of notFound() so the status is certain.
 *   const user = await getDevApiUser("api/dev/xyz");
 *   if (!user) return devNotFoundResponse();
 */
export async function getDevApiUser(where: string): Promise<JWTPayload | null> {
  const result = await decide(where);
  return result.allowed ? result.user : null;
}

export function devNotFoundResponse(): Response {
  return new Response(null, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}
