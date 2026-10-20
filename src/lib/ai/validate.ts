// src/lib/ai/validate.ts
//
// Model output is untrusted. Anything that does not match the schema exactly is
// rejected (no coercion), and accepted text is masked and length-capped again.
import { maskForModel } from "@/lib/ai/mask";
import { CATEGORIES, SEVERITIES } from "@/lib/ai/prompts";

export type Severity = (typeof SEVERITIES)[number];

export interface TriageResult {
  title: string;
  summary: string;
  severity: Severity;
  category: string;
  suggestedFix: string | null;
  confidence: number;
  needsHuman: boolean;
  evidence: string[];
}

export function validateTriage(argumentsJson: string): TriageResult | null {
  if (typeof argumentsJson !== "string" || argumentsJson.length > 20_000) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(argumentsJson);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;

  const nonEmpty = (v: unknown) => typeof v === "string" && v.trim().length > 0;
  if (!nonEmpty(o.title) || !nonEmpty(o.summary)) return null;
  if (!(SEVERITIES as readonly string[]).includes(o.severity as string)) return null;
  if (!(CATEGORIES as readonly string[]).includes(o.category as string)) return null;
  if (typeof o.confidence !== "number" || !Number.isFinite(o.confidence)) return null;
  if (o.confidence < 0 || o.confidence > 1) return null;
  if (typeof o.needsHuman !== "boolean") return null;
  if (o.suggestedFix !== undefined && o.suggestedFix !== null && typeof o.suggestedFix !== "string") return null;

  let evidence: string[] = [];
  if (o.evidence !== undefined) {
    if (!Array.isArray(o.evidence) || o.evidence.some((e) => typeof e !== "string")) return null;
    evidence = (o.evidence as string[]).slice(0, 5).map((e) => maskForModel(e, 200));
  }

  const fix = typeof o.suggestedFix === "string" ? maskForModel(o.suggestedFix, 2000).trim() : "";
  return {
    title: maskForModel(o.title, 255).trim() || "بدون عنوان",
    summary: maskForModel(o.summary, 2000).trim(),
    severity: o.severity as Severity,
    category: o.needsHuman ? "needs_human" : (o.category as string),
    suggestedFix: fix || null,
    confidence: o.confidence,
    needsHuman: o.needsHuman,
    evidence,
  };
}
