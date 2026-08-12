import { NextResponse, NextRequest } from "next/server";

/**
 * Applies two lightweight, centralized defenses to every /api/* request
 * BEFORE it reaches a route handler:
 *
 * 1. CSRF protection via Origin verification
 *    Since auth uses a cookie (not a header-based token), a malicious
 *    site could otherwise trigger state-changing requests using the
 *    victim's browser session. For any mutating method, we require that
 *    the browser-supplied `Origin` (falling back to `Referer`) header —
 *    which a browser sets automatically and a cross-site attacker cannot
 *    forge — matches this app's own origin.
 *    Requests with NO Origin/Referer at all (e.g. curl, server-to-server,
 *    some older browser edge cases) are allowed through, since a genuine
 *    CSRF attack requires a browser context that *does* send this header.
 *
 * 2. Basic request body size limit
 *    Rejects obviously oversized payloads early via the Content-Length
 *    header, before any route handler starts parsing JSON.
 *    ⚠️ Limitation: a client using chunked transfer-encoding (no
 *    Content-Length) bypasses this specific check. For this app's simple
 *    JSON-only API surface that's a low-risk gap, but it's not a byte-for-
 *    byte guarantee — a stronger version would stream-count the body.
 */

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const MAX_BODY_BYTES = 100 * 1024; // 100 KB — comfortably covers this app's JSON payloads

export function middleware(req: NextRequest) {
  if (!MUTATING_METHODS.has(req.method)) {
    return NextResponse.next();
  }

  // ---- 1. Body size guard ----
  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: "Request body too large" },
      { status: 413 }
    );
  }

  // ---- 2. CSRF / Origin guard ----
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  let sourceOrigin: string | null = origin;
  if (!sourceOrigin && referer) {
    try {
      sourceOrigin = new URL(referer).origin;
    } catch {
      sourceOrigin = null;
    }
  }

  // Build the origin this server itself is being addressed as, from the
  // actual incoming Host header — NOT from `req.nextUrl.origin`, which in
  // local dev can silently normalize to "localhost" regardless of the
  // Host header actually sent (e.g. requests to 127.0.0.1). Using Host
  // directly keeps this correct in both dev and behind Vercel's proxy
  // (which sets x-forwarded-proto/Host correctly).
  const host = req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") ??
    req.nextUrl.protocol.replace(":", "");
  const expectedOrigin = host ? `${proto}://${host}` : req.nextUrl.origin;

  if (sourceOrigin && sourceOrigin !== expectedOrigin) {
    return NextResponse.json(
      { error: "Cross-site request blocked" },
      { status: 403 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
