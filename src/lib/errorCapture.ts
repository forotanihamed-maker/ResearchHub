import { db } from "@/db";
import { errorEvents } from "@/db/schema";
import { sql } from "drizzle-orm";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_ROUTE_LENGTH = 255;

const SENSITIVE_PATTERNS: RegExp[] = [
  /\b(?:set-cookie|cookie)\s*:\s*[^\r\n]*/gi,
  /\b[A-Za-z0-9]*[_-]?(?:token|secret|password|passwd)\s*[=:]\s*[^\s,;&]+/gi,
  /\b(?:authorization|proxy-authorization)\s*:\s*[^\s,;]+/gi,
  /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi,
  /\b[A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]{2,}\.[A-Za-z0-9_-]{2,}(?:\.[A-Za-z0-9_-]{2,})?\b/g,
  /\b(?:jwt|token|access_token|refresh_token|id_token)\s*[=:]\s*[^\s,;]+/gi,
  /\b(?:password|passwd|secret)\s*[=:]\s*[^\s,;]+/gi,
  /\b(?:DATABASE_URL|POSTGRES(?:QL)?_URL)\s*[=:]\s*[^\s]+/gi,
  /postgres(?:ql)?:\/\/[^\s]+/gi,
  /https?:\/\/[^\s]*[?&](?:token|access_token|api_key|key|secret)=[^\s&]+/gi,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi,
  /\b(?:sk|pk|rk|api)[-_]?[A-Za-z0-9_-]{16,}\b/gi,
  /(?:^|[?&])(?:token|access_token|refresh_token|api_key|key|secret)=[^&\s]+/gi,
  // any other long opaque string (invite tokens, hex ids, keys)
  /\b[A-Za-z0-9_-]{32,}\b/g,
];

async function hash(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function sanitizeSensitiveText(value: unknown, maxLength: number = MAX_MESSAGE_LENGTH): string {
  let text = value instanceof Error ? value.message : String(value ?? "");
  for (const pattern of SENSITIVE_PATTERNS) {
    text = text.replace(pattern, "[REDACTED]");
  }
  return text.slice(0, maxLength);
}

export function sanitizeRoute(value: unknown): string {
  const route = String(value ?? "unknown")
    .replace(/[\r\n\t]/g, " ")
    .trim()
    .split(/[?#]/)[0];
  return sanitizeSensitiveText(route).slice(0, MAX_ROUTE_LENGTH) || "unknown";
}

export function getErrorType(error: unknown): string {
  if (error && typeof error === "object" && "constructor" in error) {
    const name = (error as { constructor?: { name?: unknown } }).constructor?.name;
    if (typeof name === "string" && name.length > 0) return name.slice(0, 100);
  }
  return "Error";
}

export async function buildErrorFingerprint(route: string, error: unknown, stack?: string): Promise<string> {
  const type = getErrorType(error);
  const firstStackLine = String(stack ?? "").split(/\r?\n/, 1)[0] ?? "";
  return hash(`${route}|${type}|${firstStackLine}`);
}

export async function buildStackHash(stack?: string): Promise<string | null> {
  if (!stack) return null;
  return hash(sanitizeSensitiveText(stack));
}

interface ErrorRow {
  source: "server" | "client";
  route: string;
  message: string;
  stackHash: string | null;
  fingerprint: string;
}

// Upserts one error. Only a brand-new fingerprint (count === 1) can grow the
// table, so only then is the cap enforced; the cleanup is awaited so it is not
// dropped when a serverless function freezes right after the response.
async function upsertError(row: ErrorRow): Promise<void> {
  const rows = await db
    .insert(errorEvents)
    .values(row)
    .onConflictDoUpdate({
      target: errorEvents.fingerprint,
      set: {
        count: sql`${errorEvents.count} + 1`,
        lastSeenAt: sql`now()`,
      },
    })
    .returning({ count: errorEvents.count });
  if (rows?.[0]?.count === 1) await cleanupOldErrorEvents();
}

/**
 * ORM errors (e.g. Drizzle's "Failed query: ...") hide the real reason in
 * `cause` (connection timeout, ECONNRESET, a Postgres error code...). Without
 * it a triage tool can only guess, so it is appended on a second line. It goes
 * through the same masking as everything else.
 */
export function describeErrorCause(error: unknown): string {
  const cause = (error as { cause?: unknown } | null)?.cause;
  if (!cause || typeof cause !== "object") return "";
  const code = (cause as { code?: unknown }).code;
  const message = (cause as { message?: unknown }).message;
  const parts = [
    typeof code === "string" ? code.slice(0, 40) : "",
    typeof message === "string" ? message.slice(0, 300) : "",
  ].filter(Boolean);
  return parts.length > 0 ? `\ncause: ${parts.join(" ")}` : "";
}

export async function reportServerError(route: unknown, error: unknown): Promise<void> {
  try {
    const cleanRoute = sanitizeRoute(route);
    const rawStack = error instanceof Error ? error.stack ?? "" : "";
    const base = error instanceof Error ? error.message : String(error ?? "");
    const message = sanitizeSensitiveText(
      base.slice(0, Math.max(0, MAX_MESSAGE_LENGTH - 350)) + describeErrorCause(error)
    );
    const fingerprint = await buildErrorFingerprint(cleanRoute, error, rawStack);
    const stackHash = await buildStackHash(rawStack);

    await upsertError({ source: "server", route: cleanRoute, message, stackHash, fingerprint });
  } catch (captureError) {
    console.error("ResearchHub error capture failed", sanitizeSensitiveText(captureError));
  }
}

export async function reportClientError(
  route: unknown,
  messageInput: unknown,
  stackInput?: unknown
): Promise<void> {
  try {
    const cleanRoute = sanitizeRoute(route);
    const message = sanitizeSensitiveText(messageInput);
    const stack = sanitizeSensitiveText(stackInput);
    const fingerprint = await buildErrorFingerprint(cleanRoute, new Error(message), stack);
    const stackHash = await buildStackHash(stack);

    await upsertError({ source: "client", route: cleanRoute, message, stackHash, fingerprint });
  } catch (captureError) {
    console.error("ResearchHub client error capture failed", sanitizeSensitiveText(captureError));
  }
}

async function cleanupOldErrorEvents(): Promise<void> {
  try {
    await db.execute(sql`
      DELETE FROM error_events
      WHERE id IN (
        SELECT id
        FROM error_events
        ORDER BY last_seen_at DESC, id DESC
        OFFSET 5000
      )
    `);
  } catch (cleanupError) {
    console.error("ResearchHub error cleanup failed", sanitizeSensitiveText(cleanupError));
  }
}
