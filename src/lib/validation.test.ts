import { describe, expect, it } from "vitest";
import {
  isValidPassword,
  isValidTaskPriority,
  isValidTaskStatus,
  parseDeadline,
  parseId,
} from "./validation";

describe("parseId", () => {
  it("accepts positive integers", () => {
    expect(parseId("1")).toBe(1);
    expect(parseId("42")).toBe(42);
  });

  it("rejects zero, negatives, decimals and non-numbers", () => {
    for (const value of ["0", "-1", "1.5", "abc", ""]) {
      expect(parseId(value)).toBeNull();
    }
  });
});

describe("parseDeadline", () => {
  it("treats empty values as no deadline", () => {
    expect(parseDeadline(null)).toEqual({ ok: true, value: null });
    expect(parseDeadline("")).toEqual({ ok: true, value: null });
    expect(parseDeadline(undefined)).toEqual({ ok: true, value: null });
  });

  it("parses a valid date", () => {
    const result = parseDeadline("2026-10-17");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeInstanceOf(Date);
  });

  it("rejects an invalid date", () => {
    expect(parseDeadline("not-a-date")).toEqual({ ok: false });
  });
});

describe("isValidPassword", () => {
  it("enforces the 8-72 character range", () => {
    expect(isValidPassword("1234567")).toBe(false);
    expect(isValidPassword("12345678")).toBe(true);
    expect(isValidPassword("a".repeat(72))).toBe(true);
    expect(isValidPassword("a".repeat(73))).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isValidPassword(12345678)).toBe(false);
    expect(isValidPassword(null)).toBe(false);
  });
});

describe("task enums", () => {
  it("accepts only the approved task statuses", () => {
    for (const status of ["todo", "in_progress", "done"]) {
      expect(isValidTaskStatus(status)).toBe(true);
    }
    expect(isValidTaskStatus("closed")).toBe(false);
    expect(isValidTaskStatus(undefined)).toBe(false);
  });

  it("accepts only the approved task priorities", () => {
    for (const priority of ["low", "medium", "high"]) {
      expect(isValidTaskPriority(priority)).toBe(true);
    }
    expect(isValidTaskPriority("urgent")).toBe(false);
    expect(isValidTaskPriority(null)).toBe(false);
  });
});
