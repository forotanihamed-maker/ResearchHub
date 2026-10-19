import { beforeEach, describe, expect, it, vi } from "vitest";

const { onConflictDoUpdate, values, insert, execute } = vi.hoisted(() => {
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  const insert = vi.fn(() => ({ values }));
  const execute = vi.fn().mockResolvedValue({ rows: [] });
  return { onConflictDoUpdate, values, insert, execute };
});

vi.mock("@/db", () => ({
  db: { insert, execute },
}));

vi.mock("@/db/schema", () => ({
  errorEvents: {
    fingerprint: "fingerprint",
    count: "count",
  },
}));

import {
  buildErrorFingerprint,
  buildStackHash,
  getErrorType,
  reportServerError,
  sanitizeRoute,
  sanitizeSensitiveText,
} from "@/lib/errorCapture";

describe("errorCapture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onConflictDoUpdate.mockResolvedValue(undefined);
    execute.mockResolvedValue({ rows: [] });
  });

  it("removes emails, bearer tokens, connection strings and secrets", () => {
    const input = [
      "email hamed@example.com",
      "Authorization: Bearer abc.def.ghi",
      "DATABASE_URL=postgresql://user:password@host/db",
      "api_key=sk_live_1234567890123456",
    ].join(" ");
    const output = sanitizeSensitiveText(input);
    expect(output).not.toContain("hamed@example.com");
    expect(output).not.toContain("abc.def.ghi");
    expect(output).not.toContain("postgresql://user:password@host/db");
    expect(output).not.toContain("sk_live_1234567890123456");
    expect(output).toContain("[REDACTED]");
  });

  it("normalizes routes and strips control characters", () => {
    expect(sanitizeRoute(" /api/reports\nsecret ")).toBe("/api/reports secret");
  });

  it("uses the same fingerprint for the same route/type/first stack line", async () => {
    const a = await buildErrorFingerprint("/api/x", new Error("one"), "Error: one\n at a");
    const b = await buildErrorFingerprint("/api/x", new Error("two"), "Error: one\n at b");
    expect(a).toBe(b);
  });

  it("creates a stack hash and exposes the error type", async () => {
    await expect(buildStackHash("stack")).resolves.toHaveLength(64);
    expect(getErrorType(new TypeError("x"))).toBe("TypeError");
  });

  it("never throws when the database capture fails", async () => {
    insert.mockImplementationOnce(() => { throw new Error("db down"); });
    await expect(reportServerError("/api/x", new Error("boom"))).resolves.toBeUndefined();
  });

  it("upserts repeated fingerprints instead of inserting a second logical record", async () => {
    await reportServerError("/api/x", new Error("boom"));
    await reportServerError("/api/x", new Error("boom"));
    expect(insert).toHaveBeenCalledTimes(2);
    expect(onConflictDoUpdate).toHaveBeenCalledTimes(2);
  });
});
