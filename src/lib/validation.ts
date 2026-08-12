export const PROJECT_STATUSES = ["open", "in_progress", "completed"] as const;
export type ProjectStatus = typeof PROJECT_STATUSES[number];

export const TITLE_MIN = 3;
export const TITLE_MAX = 255;
export const DESCRIPTION_MIN = 10;
export const DESCRIPTION_MAX = 5000;
export const MAX_MEMBERS_MIN = 1;
export const MAX_MEMBERS_MAX = 50;

/**
 * Parses a route param (string) into a positive integer ID.
 * Returns null if invalid.
 */
export function parseId(value: string): number | null {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

export function isValidProjectStatus(value: unknown): value is ProjectStatus {
  return (
    typeof value === "string" &&
    (PROJECT_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Trims and validates a title string.
 * Returns the cleaned string, or null if invalid.
 */
export function sanitizeTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < TITLE_MIN || trimmed.length > TITLE_MAX) return null;
  return trimmed;
}

/**
 * Trims and validates a description string.
 * Returns the cleaned string, or null if invalid.
 */
export function sanitizeDescription(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < DESCRIPTION_MIN || trimmed.length > DESCRIPTION_MAX) {
    return null;
  }
  return trimmed;
}

/**
 * Validates maxMembers is a positive integer within a sane range.
 * Returns the number, or null if invalid.
 */
export function parseMaxMembers(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n < MAX_MEMBERS_MIN || n > MAX_MEMBERS_MAX) {
    return null;
  }
  return n;
}

export type DeadlineResult = { ok: true; value: Date | null } | { ok: false };

/**
 * Validates an (optional) deadline value.
 * - undefined  -> not provided, caller should leave the field untouched
 * - null / ""  -> explicit "clear the deadline"
 * - otherwise  -> must parse into a valid Date
 */
export function parseDeadline(value: unknown): DeadlineResult {
  if (value === null || value === "" || value === undefined) {
    return { ok: true, value: null };
  }
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    return { ok: false };
  }
  return { ok: true, value: date };
}

// ============================================================
// User / auth validation
// ============================================================

export const DEPARTMENTS = [
  "مهندسی نرم‌افزار",
  "هوش مصنوعی",
  "شبکه‌های کامپیوتری",
  "معماری سیستم‌های کامپیوتری",
  "امنیت اطلاعات",
  "علوم داده",
] as const;
export type Department = typeof DEPARTMENTS[number];

export function isValidDepartment(value: unknown): value is Department {
  return (
    typeof value === "string" &&
    (DEPARTMENTS as readonly string[]).includes(value)
  );
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const EMAIL_MAX = 255;

/**
 * Trims, lowercases and validates an email address's basic shape.
 * Returns the cleaned email, or null if invalid.
 */
export function sanitizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0 || trimmed.length > EMAIL_MAX) return null;
  if (!EMAIL_REGEX.test(trimmed)) return null;
  return trimmed;
}

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // bcrypt silently truncates beyond this

export function isValidPassword(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= PASSWORD_MIN &&
    value.length <= PASSWORD_MAX
  );
}

export const NAME_MIN = 2;
export const NAME_MAX = 100;

export function sanitizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < NAME_MIN || trimmed.length > NAME_MAX) return null;
  return trimmed;
}

export type OptionalTextResult =
  | { ok: true; value: string | null }
  | { ok: false };

/**
 * Validates an optional free-text field (e.g. university, bio).
 * - undefined / null / "" / " " (whitespace only) -> no value / clear the field
 * - otherwise                                       -> trimmed string, must not exceed maxLen
 *
 * Note: for PATCH-style endpoints where "not provided" must be
 * distinguished from "explicitly cleared" so untouched fields are left
 * alone, check `value !== undefined` before calling this function.
 */
export function parseOptionalText(
  value: unknown,
  maxLen: number
): OptionalTextResult {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") return { ok: false };
  const trimmed = value.trim();
  if (trimmed.length > maxLen) return { ok: false };
  return { ok: true, value: trimmed.length === 0 ? null : trimmed };
}

// ============================================================
// Interests & Programming Languages
// (replaces the old free-form Skills system)
// ============================================================

// Programming languages MUST come from this fixed list — never free text.
export const PROGRAMMING_LANGUAGES = [
  "Python",
  "JavaScript",
  "TypeScript",
  "Java",
  "C",
  "C++",
  "C#",
  "Go",
  "Rust",
  "PHP",
  "Kotlin",
  "Swift",
] as const;
export type ProgrammingLanguage = typeof PROGRAMMING_LANGUAGES[number];

export const MAX_PROGRAMMING_LANGUAGES = 8;
export const MAX_INTERESTS = 8;
export const INTEREST_MIN_LEN = 2;
export const INTEREST_MAX_LEN = 60;

/**
 * Validates `programmingLanguages`: must be an array of strings, each one
 * of the fixed PROGRAMMING_LANGUAGES values, deduplicated, capped at
 * MAX_PROGRAMMING_LANGUAGES entries.
 * - undefined -> not provided, caller leaves the field untouched
 * - otherwise -> must be a valid array (possibly empty, to clear it)
 * Returns the cleaned list, or null if invalid.
 */
export function validateProgrammingLanguages(
  value: unknown
): ProgrammingLanguage[] | null {
  if (!Array.isArray(value)) return null;
  const deduped = [...new Set(value)];
  if (deduped.length > MAX_PROGRAMMING_LANGUAGES) return null;
  const allowed = PROGRAMMING_LANGUAGES as readonly string[];
  if (!deduped.every((v) => typeof v === "string" && allowed.includes(v))) {
    return null;
  }
  return deduped as ProgrammingLanguage[];
}

/**
 * Validates `interests`: an array of short free-text labels (e.g.
 * "Machine Learning", "Web Security"). Not restricted to a fixed list —
 * but trimmed, deduplicated, length-checked per item, and capped in count.
 * Returns the cleaned list, or null if invalid.
 */
export function validateInterests(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > MAX_INTERESTS) return null;

  const cleaned: string[] = [];
  for (const raw of value) {
    if (typeof raw !== "string") return null;
    const trimmed = raw.trim();
    if (
      trimmed.length < INTEREST_MIN_LEN ||
      trimmed.length > INTEREST_MAX_LEN
    ) {
      return null;
    }
    cleaned.push(trimmed);
  }

  return [...new Set(cleaned)];
}
