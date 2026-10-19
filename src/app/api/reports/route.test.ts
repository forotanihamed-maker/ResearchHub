import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthUser, createIssueReportWithRateLimit } = vi.hoisted(() => ({ getAuthUser: vi.fn(), createIssueReportWithRateLimit: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getAuthUser: () => getAuthUser() }));
vi.mock("@/lib/reportRateLimit", () => ({ createIssueReportWithRateLimit: (...args: unknown[]) => createIssueReportWithRateLimit(...args) }));
vi.mock("@/lib/auditLog", () => ({ auditLog: vi.fn() }));

import { POST, validateReportInput } from "@/app/api/reports/route";

beforeEach(() => {
  getAuthUser.mockReset();
  createIssueReportWithRateLimit.mockReset();
});

describe("POST /api/reports", () => {
  it("returns 401 without authentication", async () => {
    getAuthUser.mockResolvedValueOnce(null);
    const res = await POST(new Request("http://localhost/api/reports", { method: "POST", body: "{}" }));
    expect(res.status).toBe(401);
  });

  it("validates path, description and category", () => {
    expect(validateReportInput({ pagePath: "dashboard", description: "valid description" }).ok).toBe(false);
    expect(validateReportInput({ pagePath: "/dashboard", description: "short" }).ok).toBe(false);
    expect(validateReportInput({ pagePath: "/dashboard", description: "a valid description", category: "invalid" }).ok).toBe(false);
    expect(validateReportInput({ pagePath: "/dashboard", description: "a valid description", category: "فنی" }).ok).toBe(true);
  });

  it("returns 201 for a valid report", async () => {
    getAuthUser.mockResolvedValueOnce({ userId: 7, role: "student" });
    createIssueReportWithRateLimit.mockResolvedValueOnce({ allowed: true, id: 123 });
    const res = await POST(new Request("http://localhost/api/reports", {
      method: "POST",
      body: JSON.stringify({ pagePath: "/dashboard", description: "مشکل در نمایش پروژه" }),
      headers: { "content-type": "application/json" },
    }));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: 123 });
  });

  it("returns 429 when the database-backed report limit is reached", async () => {
    getAuthUser.mockResolvedValueOnce({ userId: 7, role: "student" });
    createIssueReportWithRateLimit.mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 3600 });
    const res = await POST(new Request("http://localhost/api/reports", {
      method: "POST",
      body: JSON.stringify({ pagePath: "/dashboard", description: "مشکل در نمایش پروژه" }),
      headers: { "content-type": "application/json" },
    }));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3600");
  });
});
