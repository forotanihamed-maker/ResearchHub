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
  /\b[A-Za-z0-9_-]{32,}\b/g,
];

const PHONE = /(?:\+98|0098|0)9\d{9}/g;
const IP = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const FILE_PATH = /(?:[A-Za-z]:\\[^\s]+|(?:\/[^\s/]+){2,})/g;
const QUERY_URL = /https?:\/\/[^\s]+[?][^\s]+/gi;
const LONG_OPAQUE = /\b[A-Za-z0-9_-]{40,}\b/g;

function sanitizeSensitiveText(value: unknown): string {
  let text = value instanceof Error ? value.message : String(value ?? "");
  for (const pattern of SENSITIVE_PATTERNS) text = text.replace(pattern, "[REDACTED]");
  return text.slice(0, 2000);
}

export function maskForAI(value: unknown, maxLength = 4000): string {
  let text = sanitizeSensitiveText(value);
  text = text.replace(PHONE, "[PHONE]");
  text = text.replace(QUERY_URL, "[URL_WITH_QUERY]");
  text = text.replace(IP, "[IP]");
  text = text.replace(FILE_PATH, "[FILE_PATH]");
  text = text.replace(LONG_OPAQUE, "[OPAQUE]");
  return text.slice(0, maxLength);
}

export function maskStack(stack: unknown): string {
  return maskForAI(String(stack ?? "").split(/\r?\n/).slice(0, 3).join("\n"), 3000);
}

export function maskPagePath(path: unknown): string {
  const clean = String(path ?? "unknown").split(/[?#]/)[0];
  return maskForAI(clean, 500);
}
