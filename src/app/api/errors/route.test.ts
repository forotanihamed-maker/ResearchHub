import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthUser, reportClientError, consumeClientErrorRateLimit } = vi.hoisted(() => ({ getAuthUser: vi.fn(), reportClientError: vi.fn(), consumeClientErrorRateLimit: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getAuthUser: () => getAuthUser() }));
vi.mock("@/lib/errorCapture", () => ({ reportClientError: (...args: unknown[]) => reportClientError(...args) }));
vi.mock("@/lib/reportRateLimit", () => ({ consumeClientErrorRateLimit: (...args: unknown[]) => consumeClientErrorRateLimit(...args) }));
vi.mock("@/lib/auditLog", () => ({ auditLog: vi.fn() }));

import { POST, validateClientErrorInput } from "@/app/api/errors/route";

beforeEach(() => {
  getAuthUser.mockReset();
  reportClientError.mockReset();
  consumeClientErrorRateLimit.mockReset();
  reportClientError.mockResolvedValue(undefined);
  consumeClientErrorRateLimit.mockReturnValue({ allowed: true });
});

describe("POST /api/errors", () => {
  it("returns 401 without authentication", async () => {
    getAuthUser.mockResolvedValueOnce(null);
    const res = await POST(new Request("http://localhost/api/errors", { method: "POST", body: "{}" }));
    expect(res.status).toBe(401);
  });

  it("rejects invalid payloads", () => {
    expect(validateClientErrorInput({ route: "/x", message: "" }).ok).toBe(false);
    expect(validateClientErrorInput({ route: "", message: "boom" }).ok).toBe(false);
    expect(validateClientErrorInput({ route: "/x", message: "boom" }).ok).toBe(true);
  });

  it("rejects oversized requests before JSON parsing", async () => {
    getAuthUser.mockResolvedValueOnce({ userId: 7, role: "student" });
    const res = await POST(new Request("http://localhost/api/errors", {
      method: "POST",
      body: "x".repeat(9000),
      headers: { "content-length": "9000" },
    }));
    expect(res.status).toBe(413);
  });

  it("returns 429 at the client-error rate limit", async () => {
    getAuthUser.mockResolvedValueOnce({ userId: 7, role: "student" });
    consumeClientErrorRateLimit.mockReturnValueOnce({ allowed: false, retryAfterSeconds: 120 });
    const res = await POST(new Request("http://localhost/api/errors", {
      method: "POST",
      body: JSON.stringify({ route: "/dashboard", message: "boom" }),
      headers: { "content-type": "application/json" },
    }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("120");
  });

  it("accepts a valid browser error and delegates sanitized capture", async () => {
    getAuthUser.mockResolvedValueOnce({ userId: 7, role: "student" });
    const res = await POST(new Request("http://localhost/api/errors", {
      method: "POST",
      body: JSON.stringify({ route: "/dashboard", message: "boom", stack: "stack" }),
      headers: { "content-type": "application/json" },
    }));
    expect(res.status).toBe(202);
    expect(reportClientError).toHaveBeenCalledWith("/dashboard", "boom", "stack");
  });
});
