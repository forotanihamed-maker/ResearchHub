// src/lib/ai/mask.ts
//
// Everything that is sent to a model goes through here first. The masking is
// deliberately blunt: a wrongly masked word costs a little accuracy, a missed
// secret or personal detail costs far more.
import { sanitizeSensitiveText } from "@/lib/errorCapture";

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function toAsciiDigits(text: string): string {
  return text.replace(/[۰-۹٠-٩]/g, (ch) => {
    const i = PERSIAN_DIGITS.indexOf(ch);
    return String(i >= 0 ? i : ARABIC_DIGITS.indexOf(ch));
  });
}

const EXTRA_PATTERNS: Array<[RegExp, string]> = [
  // URLs: drop everything after the path's query (keeps host + path)
  [/(https?:\/\/[^\s?#"'<>]+)[?#][^\s"'<>]*/gi, "$1"],
  // Windows and Unix file paths
  [/\b[A-Za-z]:\\[^\s"'<>|]+/g, "[path]"],
  [/(?<![\w:/])\/(?:home|Users|var|app|usr|etc|opt|tmp|srv|root|mnt)\/[^\s"'<>]+/g, "[path]"],
  // IPv4
  [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, "[ip]"],
  // Iranian mobile numbers (digits already normalised to ASCII)
  [/(?<![0-9])(?:\+98|0098|0)?9\d{9}(?![0-9])/g, "[phone]"],
  // national / student ids and any other long digit run
  [/(?<![0-9])\d{8,}(?![0-9])/g, "[number]"],
];

/**
 * Masks text for a model. Digits are normalised first so that Persian-digit
 * phone numbers are caught, and angle brackets are neutralised so user text
 * can never close or forge the data tags used in the prompt.
 */
export function maskForModel(input: unknown, maxLength = 2000): string {
  let text = toAsciiDigits(typeof input === "string" ? input : String(input ?? ""));
  text = sanitizeSensitiveText(text);
  for (const [pattern, replacement] of EXTRA_PATTERNS) {
    text = text.replace(pattern, replacement);
  }
  text = text.replace(/</g, "‹").replace(/>/g, "›");
  return text.slice(0, maxLength);
}
