import { beforeEach, describe, expect, it, vi } from "vitest";

const { returning, onConflictDoUpdate, values, insert, execute } = vi.hoisted(() => {
  const returning = vi.fn().mockResolvedValue([{ count: 2 }]);
  const onConflictDoUpdate = vi.fn(() => ({ returning }));
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  const insert = vi.fn(() => ({ values }));
  const execute = vi.fn().mockResolvedValue({ rows: [] });
  return { returning, onConflictDoUpdate, values, insert, execute };
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
    returning.mockResolvedValue([{ count: 2 }]);
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

  it("also redacts cookies, *_token values and long opaque strings", () => {
    const out = sanitizeSensitiveText(
      "Cookie: auth_token=plainvalue123; x=1 | session_token=zzz999 | invite 0123456789abcdef0123456789abcdef0123456789"
    );
    expect(out).not.toContain("plainvalue123");
    expect(out).not.toContain("zzz999");
    expect(out).not.toContain("0123456789abcdef0123456789abcdef0123456789");
  });

  it("drops the query string and fragment from routes", () => {
    expect(sanitizeRoute("/api/x?token=abc&email=a@b.io#frag")).toBe("/api/x");
    expect(sanitizeRoute("/invite/0123456789abcdef0123456789abcdef0123456789")).not.toMatch(/0123456789abcdef/);
  });

  it("enforces the row cap only for a NEW fingerprint, and keeps the NEWEST rows", async () => {
    returning.mockResolvedValueOnce([{ count: 7 }]);
    await reportServerError("/api/a", new Error("seen before"));
    expect(execute).not.toHaveBeenCalled();

    returning.mockResolvedValueOnce([{ count: 1 }]);
    await reportServerError("/api/b", new Error("brand new"));
    expect(execute).toHaveBeenCalledTimes(1);
    // Regression: the first version ordered ASC and deleted the newest rows.
    const text = JSON.stringify(execute.mock.calls[0][0]);
    expect(text).toMatch(/last_seen_at DESC/);
    expect(text).not.toMatch(/last_seen_at ASC/);
  });
});
