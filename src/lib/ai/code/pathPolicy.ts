// src/lib/ai/code/pathPolicy.ts
//
// The ONLY gate between a model-chosen path and the repository. Default is
// deny: a path must look like a plain relative path under src/, use a short
// whitelist of characters and extensions, and match no sensitive-name rule.
// Model-supplied paths are attacker-influenced (prompt injection), so this is
// deliberately stricter than needed.

export const ALLOWED_ROOT = "src";
export const ALLOWED_EXTENSIONS = [".ts", ".tsx", ".js", ".mjs", ".css", ".json"] as const;
export const MAX_PATH_LENGTH = 200;
export const MAX_READ_BYTES = 40_000;

const SAFE_CHARS = /^[A-Za-z0-9_\-./\[\]()@]+$/;

/** Segment names that must never be listed or read, whatever the extension. */
const FORBIDDEN_SEGMENT = [
  /^\.env/i, /^\.git/i, /^node_modules$/i, /^migrations?$/i, /^drizzle/i,
  /secret/i, /token/i, /credential/i, /password/i, /passwd/i, /private/i,
  /apikey|api[-_]key/i, /\.pem$/i, /\.key$/i, /\.p12$/i, /\.pfx$/i, /^id_(rsa|ed25519|dsa)/i,
  /^seed/i, /^\.vercel$/i,
];

export type PathVerdict = { ok: true; path: string } | { ok: false; reason: string };

function segmentForbidden(seg: string): boolean {
  return FORBIDDEN_SEGMENT.some((re) => re.test(seg));
}

/** Validates a path for listing (directory) or reading (file). */
export function checkPath(input: unknown, kind: "file" | "dir"): PathVerdict {
  if (typeof input !== "string") return { ok: false, reason: "not_a_string" };
  let p = input.trim();
  if (kind === "dir") p = p.replace(/\/+$/, "");
  if (p.length === 0 || p.length > MAX_PATH_LENGTH) return { ok: false, reason: "bad_length" };
  if (!SAFE_CHARS.test(p)) return { ok: false, reason: "bad_characters" }; // %, \, NUL, spaces, unicode...
  if (p.startsWith("/")) return { ok: false, reason: "absolute_path" };
  const segments = p.split("/");
  if (segments.some((s) => s === "" || s === "." || s === ".." || /^\.+$/.test(s))) {
    return { ok: false, reason: "traversal_or_empty_segment" };
  }
  if (segments[0] !== ALLOWED_ROOT) return { ok: false, reason: "outside_src" };
  if (segments.some(segmentForbidden)) return { ok: false, reason: "forbidden_name" };
  if (kind === "file") {
    const lower = p.toLowerCase();
    if (!ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))) return { ok: false, reason: "extension_not_allowed" };
  }
  return { ok: true, path: p };
}

/** Whether a directory entry returned by GitHub may be shown to the model. */
export function entryVisible(parentDir: string, name: string, type: string): boolean {
  if (type !== "file" && type !== "dir") return false; // symlink, submodule...
  return checkPath(`${parentDir}/${name}`, type === "dir" ? "dir" : "file").ok;
}

/**
 * Best-effort removal of secret-looking literals from file content before it
 * goes to a model. Not a guarantee: the path policy is the real protection.
 * (Does NOT reuse sanitizeSensitiveText: that one would mangle code such as
 * process.env.FOO because it treats a.b.c as a JWT.)
 */
export function redactCode(text: string): string {
  return text
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, "[REDACTED_KEY]")
    .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, "[REDACTED_URL]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]{10,}=*/g, "Bearer [REDACTED]")
    .replace(/\b(?:sk|pk|rk)[-_][A-Za-z0-9_-]{16,}\b/g, "[REDACTED]")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}\b/g, "[REDACTED_JWT]")
    .replace(/(["'`])[A-Za-z0-9+\/_-]{40,}={0,2}\1/g, "$1[REDACTED]$1");
}
