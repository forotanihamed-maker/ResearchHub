import { db } from "@/db";
import { skills } from "@/db/schema";
import { inArray } from "drizzle-orm";

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

/**
 * Validates that skillIds is an array of positive integers and that
 * every one of them actually exists in the skills table.
 * Returns the deduplicated list of valid IDs, or null if the input
 * is malformed or references skills that don't exist.
 */
export async function validateSkillIds(
  value: unknown
): Promise<number[] | null> {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;

  const ids = [...new Set(value.map((v) => Number(v)))];
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) return null;
  if (ids.length === 0) return [];

  const found = await db
    .select({ id: skills.id })
    .from(skills)
    .where(inArray(skills.id, ids));

  if (found.length !== ids.length) return null;
  return ids;
}
