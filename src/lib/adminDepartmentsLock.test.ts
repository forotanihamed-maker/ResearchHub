// Stage 3 — admins cannot change their own departments.
// Route handlers with auth and the DB mocked; proves PATCH never touches the
// DB for any caller, and that GET still returns the selected departments.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEPARTMENTS } from "@/lib/validation";

const getAuthUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuthUser: () => getAuthUser() }));

const select = vi.fn();
const insert = vi.fn();
const del = vi.fn();
const update = vi.fn();
const transaction = vi.fn();
vi.mock("@/db", () => ({
  db: {
    select: (...a: unknown[]) => select(...a),
    insert: (...a: unknown[]) => insert(...a),
    delete: (...a: unknown[]) => del(...a),
    update: (...a: unknown[]) => update(...a),
    transaction: (...a: unknown[]) => transaction(...a),
  },
}));

import { GET, PATCH } from "@/app/api/admin/departments/route";

const MSG = "تعیین گروه‌های آموزشی فقط توسط مالک سامانه انجام می‌شود.";
const noDbWrites = () => {
  expect(select).not.toHaveBeenCalled();
  expect(insert).not.toHaveBeenCalled();
  expect(del).not.toHaveBeenCalled();
  expect(update).not.toHaveBeenCalled();
  expect(transaction).not.toHaveBeenCalled();
};

beforeEach(() => {
  for (const f of [getAuthUser, select, insert, del, update, transaction])
    f.mockReset();
});

describe("PATCH /api/admin/departments", () => {
  it("401 when not logged in", async () => {
    getAuthUser.mockResolvedValue(null);
    expect((await PATCH()).status).toBe(401);
    noDbWrites();
  });

  it.each(["student", "professor"])("403 for %s", async (role) => {
    getAuthUser.mockResolvedValue({ userId: 1, role });
    const res = await PATCH();
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("دسترسی مجاز نیست");
    noDbWrites();
  });

  it("403 owner-only message for admin, and no DB access at all", async () => {
    getAuthUser.mockResolvedValue({ userId: 10, role: "admin" });
    // the handler takes no request: a body with all departments is never read
    const res = await (PATCH as unknown as (r: Request) => Promise<Response>)(
      new Request("http://x/api/admin/departments", {
        method: "PATCH",
        body: JSON.stringify({ departments: [...DEPARTMENTS] }),
      })
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe(MSG);
    noDbWrites();
  });
});

describe("GET /api/admin/departments (unchanged)", () => {
  it("returns the admin's selected departments", async () => {
    getAuthUser.mockResolvedValue({ userId: 10, role: "admin" });
    select.mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([{ department: "علوم داده" }]),
      }),
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.selected).toEqual(["علوم داده"]);
    expect(body.departments).toEqual([...DEPARTMENTS]);
  });
});
