// src/lib/ai/fileHints.ts
//
// Suggests which source files a developer (or a coding assistant) should open
// first for a given report/error. Pure and deterministic; no model call.
//
// Two sources, both FIXED lists that never contain user text:
//   1. the route manifest (src/lib/ai/routeManifest.json): maps a page path or
//      an API route to its file, and lists the API routes of the same area;
//   2. a small keyword table mapping words in the report to the files that
//      usually own that feature.
// User text only selects among these fixed entries, so it cannot inject a path.
// Both lists are checked by tests: the manifest against the real src/app tree,
// and every file named in the keyword table against the manifest/disk.
import manifest from "@/lib/ai/routeManifest.json";

export interface FileHint {
  path: string;
  reason: string;
}

export interface HintInput {
  /** Page URL path ("/dashboard/projects/4") or API route ("/api/projects/4/files"). */
  routes: string[];
  /** Free text (report text, titles) used only for keyword matching. */
  text: string;
}

const MAX_HINTS = 10;
const MAX_AREA_ROUTES = 6;

/** Files per feature keyword group. Paths must exist; a test enforces it. */
export const KEYWORD_FILES: Array<{ label: string; words: string[]; files: string[] }> = [
  {
    label: "آپلود/فایل",
    words: ["آپلود", "بارگذاری", "فایل", "پیوست", "upload", "attachment", "file"],
    files: [
      "src/app/api/projects/[id]/files/route.ts",
      "src/lib/validation.ts",
      "src/components/projects/ProjectFiles.tsx",
      "src/components/projects/ChatPanel.tsx",
    ],
  },
  {
    label: "ورود/احراز هویت",
    words: ["ورود", "لاگین", "رمز", "خروج", "login", "logout", "password", "token", "نشست"],
    files: [
      "src/app/api/auth/login/route.ts",
      "src/lib/auth.ts",
      "src/contexts/AuthContext.tsx",
    ],
  },
  {
    label: "ثبت‌نام",
    words: ["ثبت نام", "ثبت‌نام", "عضویت", "register", "signup"],
    files: ["src/app/api/auth/register/route.ts", "src/lib/validation.ts"],
  },
  {
    label: "چت/پیام",
    words: ["چت", "پیام", "گفتگو", "گفت‌وگو", "chat", "message"],
    files: [
      "src/components/projects/ChatPanel.tsx",
      "src/app/api/projects/[id]/messages/route.ts",
    ],
  },
  {
    label: "تسک‌ها",
    words: ["تسک", "وظیفه", "کار", "task"],
    files: [
      "src/components/projects/TasksPanel.tsx",
      "src/app/api/projects/[id]/tasks/route.ts",
    ],
  },
  {
    label: "نقاط عطف",
    words: ["مایلستون", "نقطه عطف", "نقاط عطف", "milestone", "پیشرفت"],
    files: [
      "src/components/projects/MilestonesPanel.tsx",
      "src/app/api/projects/[id]/milestones/route.ts",
    ],
  },
  {
    label: "درخواست عضویت در پروژه",
    words: ["درخواست", "پذیرش", "تایید", "تأیید", "رد کردن", "application", "apply"],
    files: [
      "src/components/projects/ApplicationsPanel.tsx",
      "src/app/api/applications/route.ts",
    ],
  },
  {
    label: "پروژه‌ها",
    words: ["پروژه", "لیست پروژه", "project"],
    files: ["src/app/api/projects/route.ts", "src/components/projects/ProjectCard.tsx"],
  },
  {
    label: "مدیریت (ادمین)",
    words: ["ادمین", "مدیر", "admin", "استاد جدید", "گروه آموزشی"],
    files: ["src/app/api/admin/professors/route.ts", "src/lib/adminScope.ts"],
  },
];

/** Persian/Arabic letter and spacing normalisation so "تأیید" == "تایید" etc. */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآ]/g, "ا")
    .replace(/[‌‏‎ً-ْ]/g, "")
    .replace(/\s+/g, " ");
}

const PLURAL_SUFFIX = /^(ها|های|هایی|ی)$/;

/**
 * Word-based match (not substring): "کار" must not fire on "کاربر".
 * Multi-word keywords use plain containment; short words (<4 letters) must be
 * an exact token or take a plural/ezafe suffix, longer ones may continue.
 */
function textHasWord(text: string, word: string): boolean {
  const w = normalizeText(word);
  if (/[^\p{L}\p{N}]/u.test(w)) return text.includes(w);
  return text.split(/[^\p{L}\p{N}]+/u).some((t) => {
    if (t === w) return true;
    if (!t.startsWith(w)) return false;
    const rest = t.slice(w.length);
    return PLURAL_SUFFIX.test(rest) || (w.length >= 4 && rest.length <= 3);
  });
}

interface Pattern {
  file: string;
  segments: string[]; // "[id]" = one dynamic segment
  catchAll: boolean;
  isApi: boolean;
}

function toPattern(file: string): Pattern {
  const rel = file.replace(/^src\/app\//, "").replace(/\/(page|route)\.(ts|tsx)$/, "");
  const segments = rel
    .split("/")
    .filter((s) => s.length > 0 && !(s.startsWith("(") && s.endsWith(")")));
  const catchAll = segments.length > 0 && /^\[\.\.\./.test(segments[segments.length - 1]);
  return { file, segments, catchAll, isApi: segments[0] === "api" };
}

const PATTERNS: Pattern[] = (manifest as string[]).map(toPattern);

function urlSegments(route: string): string[] {
  const clean = route.split(/[?#]/)[0];
  return clean.split("/").filter((s) => s.length > 0 && s !== "..");
}

/** Number of static segments matched, or -1 when the pattern does not match. */
function matchScore(pattern: Pattern, url: string[]): number {
  const segs = pattern.segments;
  const fixed = pattern.catchAll ? segs.length - 1 : segs.length;
  if (pattern.catchAll ? url.length < fixed : url.length !== fixed) return -1;
  let score = 0;
  for (let i = 0; i < fixed; i++) {
    const s = segs[i];
    if (s.startsWith("[")) continue;
    if (s !== url[i]) return -1;
    score++;
  }
  return score;
}

/** Best matching file for a URL path, preferring more static segments. */
export function fileForRoute(route: string): string | null {
  const url = urlSegments(route);
  if (url.length === 0) return null;
  let best: { file: string; score: number } | null = null;
  for (const pattern of PATTERNS) {
    const score = matchScore(pattern, url);
    if (score < 0) continue;
    if (!best || score > best.score) best = { file: pattern.file, score };
  }
  return best?.file ?? null;
}

/** API route files of the same area as a dashboard page: /dashboard/projects/4 -> api/projects/... */
function apiRoutesForArea(route: string): string[] {
  const url = urlSegments(route);
  const area = url[0] === "dashboard" ? url[1] : url[0] === "api" ? url[1] : undefined;
  if (!area || area === "dev" || area === "cron") return [];
  return PATTERNS.filter((p) => p.isApi && p.segments[1] === area)
    .map((p) => p.file)
    .slice(0, MAX_AREA_ROUTES);
}

export function suggestFiles(input: HintInput): FileHint[] {
  const hints: FileHint[] = [];
  const seen = new Set<string>();
  const add = (path: string, reason: string) => {
    if (seen.has(path) || hints.length >= MAX_HINTS) return;
    seen.add(path);
    hints.push({ path, reason });
  };

  for (const route of input.routes) {
    const file = fileForRoute(route);
    if (file) add(file, "فایل مسیر");
  }

  const text = normalizeText(input.text);
  for (const group of KEYWORD_FILES) {
    if (group.words.some((w) => textHasWord(text, w))) {
      for (const file of group.files) add(file, `کلمه‌ی کلیدی: ${group.label}`);
    }
  }

  for (const route of input.routes) {
    for (const file of apiRoutesForArea(route)) add(file, "API هم‌حوزه");
  }
  return hints;
}
