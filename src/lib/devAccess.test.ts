// Dev-panel access: who gets in, who gets 404, and what is audit-logged.
import { beforeEach, describe, expect, it, vi } from "vitest";

// notFound() throws a special error in Next; mimic it so the page guard
// "never returns" exactly like production.
class NotFoundSignal extends Error {}
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new NotFoundSignal("NEXT_NOT_FOUND");
  },
}));

const getAuthUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuthUser: () => getAuthUser() }));

const auditLog = vi.fn();
vi.mock("@/lib/auditLog", () => ({
  auditLog: (...args: unknown[]) => auditLog(...args),
}));

import {
  devNotFoundResponse,
  getDevApiUser,
  isDevAdminEmail,
  isEmailInList,
  parseDevAdminEmails,
  requireDevPanelUser,
} from "./devAccess";
import { GET as devMeGET } from "@/app/api/dev/me/route";

type Role = "student" | "professor" | "admin";
const user = (role: Role, email: string, id = 1) => ({
  userId: id,
  email,
  role,
  name: "x",
});

beforeEach(() => {
  getAuthUser.mockReset();
  auditLog.mockReset();
  process.env.DEV_ADMIN_EMAILS = "Owner@Example.com, second@example.com ,";
});

describe("e-mail list parsing", () => {
  it("trims, lower-cases and drops empty entries", () => {
    expect([...parseDevAdminEmails(" A@x.io ,, b@x.io ,")]).toEqual([
      "a@x.io",
      "b@x.io",
    ]);
  });

  it("matches case-insensitively and exactly", () => {
    expect(isDevAdminEmail("owner@example.com")).toBe(true);
    expect(isDevAdminEmail("  OWNER@EXAMPLE.COM ")).toBe(true);
    expect(isDevAdminEmail("owner@example.com.evil.io")).toBe(false);
    expect(isDevAdminEmail("xowner@example.com")).toBe(false);
    expect(isDevAdminEmail("example.com")).toBe(false);
  });

  it("fails closed when the list is unset, empty or only commas", () => {
    for (const raw of [undefined, "", "   ", ",,,"]) {
      expect(isEmailInList("owner@example.com", raw)).toBe(false);
    }
    delete process.env.DEV_ADMIN_EMAILS;
    expect(isDevAdminEmail("owner@example.com")).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(isDevAdminEmail(null)).toBe(false);
    expect(isDevAdminEmail(undefined)).toBe(false);
    expect(isDevAdminEmail(42 as unknown as string)).toBe(false);
  });
});

describe("requireDevPanelUser (pages/layouts)", () => {
  it("404s a logged-out visitor", async () => {
    getAuthUser.mockResolvedValue(null);
    await expect(requireDevPanelUser("t")).rejects.toBeInstanceOf(NotFoundSignal);
  });

  it.each<[Role, string]>([
    ["student", "stud@x.io"],
    ["professor", "prof@x.io"],
    ["admin", "dept.admin@x.io"],
  ])("404s a %s who is not on the list", async (role, email) => {
    getAuthUser.mockResolvedValue(user(role, email));
    await expect(requireDevPanelUser("t")).rejects.toBeInstanceOf(NotFoundSignal);
  });

  it("allows the listed owner (case-insensitive e-mail)", async () => {
    getAuthUser.mockResolvedValue(user("admin", "OWNER@example.com", 7));
    const u = await requireDevPanelUser("t");
    expect(u.userId).toBe(7);
  });

  it("404s everyone when DEV_ADMIN_EMAILS is not configured", async () => {
    delete process.env.DEV_ADMIN_EMAILS;
    getAuthUser.mockResolvedValue(user("admin", "owner@example.com"));
    await expect(requireDevPanelUser("t")).rejects.toBeInstanceOf(NotFoundSignal);
  });

  it("revokes at the next request when the account e-mail changes", async () => {
    getAuthUser.mockResolvedValueOnce(user("admin", "owner@example.com"));
    await expect(requireDevPanelUser("t")).resolves.toBeDefined();
    // getAuthUser re-reads the DB each call; the e-mail is now different
    getAuthUser.mockResolvedValueOnce(user("admin", "changed@example.com"));
    await expect(requireDevPanelUser("t")).rejects.toBeInstanceOf(NotFoundSignal);
  });
});

describe("audit log", () => {
  it("logs access with where + userId", async () => {
    getAuthUser.mockResolvedValue(user("admin", "owner@example.com", 7));
    await requireDevPanelUser("dashboard/dev/tasks");
    expect(auditLog).toHaveBeenCalledWith("dev_panel_access", {
      where: "dashboard/dev/tasks",
      userId: 7,
    });
  });

  it("logs denials without ever including an e-mail", async () => {
    getAuthUser.mockResolvedValue(user("student", "secret.student@x.io", 3));
    await expect(requireDevPanelUser("w")).rejects.toBeDefined();
    getAuthUser.mockResolvedValue(null);
    await expect(requireDevPanelUser("w")).rejects.toBeDefined();
    expect(auditLog).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(auditLog.mock.calls)).not.toContain("@");
    expect(auditLog.mock.calls[0][0]).toBe("dev_panel_denied");
    expect(auditLog.mock.calls[0][1]).toMatchObject({
      reason: "not_allowed",
      userId: 3,
      role: "student",
    });
    expect(auditLog.mock.calls[1][1]).toMatchObject({ reason: "unauthenticated" });
  });

  it("distinguishes not_configured from not_allowed", async () => {
    delete process.env.DEV_ADMIN_EMAILS;
    getAuthUser.mockResolvedValue(user("admin", "owner@example.com"));
    await getDevApiUser("w");
    expect(auditLog.mock.calls[0][1]).toMatchObject({ reason: "not_configured" });
  });
});

describe("API routes", () => {
  it("getDevApiUser returns null for non-listed users and the user for listed", async () => {
    getAuthUser.mockResolvedValue(user("admin", "dept@x.io"));
    expect(await getDevApiUser("w")).toBeNull();
    getAuthUser.mockResolvedValue(user("admin", "owner@example.com", 9));
    expect((await getDevApiUser("w"))?.userId).toBe(9);
  });

  it("devNotFoundResponse is an empty 404", async () => {
    const res = devNotFoundResponse();
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("");
  });

  it("GET /api/dev/me: 404 logged out, student, professor, dept admin; 200 for owner", async () => {
    getAuthUser.mockResolvedValue(null);
    expect((await devMeGET()).status).toBe(404);
    for (const role of ["student", "professor", "admin"] as Role[]) {
      getAuthUser.mockResolvedValue(user(role, `${role}@x.io`));
      expect((await devMeGET()).status).toBe(404);
    }
    getAuthUser.mockResolvedValue(user("admin", "owner@example.com", 5));
    const res = await devMeGET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, userId: 5 });
  });
});
