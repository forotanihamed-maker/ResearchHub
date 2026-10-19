// Stage 2 — admin faculty scope.
//
// What this file really tests: the two route handlers, with auth, the scope
// helper and the DB mocked. It checks (a) status codes, (b) that nothing is
// queried when it must not be, and (c) the exact WHERE clause sent to the
// database (rendered to SQL + params with drizzle's own dialect).
// What it does NOT test: that a real PostgreSQL returns the right rows. That
// needs a test database; see the report for the setup and the manual run.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const getAuthUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getAuthUser: () => getAuthUser() }));

const getAdminDepartments = vi.fn();
vi.mock("@/lib/adminScope", () => ({
  getAdminDepartments: (id: number) => getAdminDepartments(id),
}));

type Recorded = { where?: SQL };
const queries: Recorded[] = [];
let queued: unknown[][] = [];
const select = vi.fn(() => {
  const rec: Recorded = {};
  queries.push(rec);
  const rows = queued.shift() ?? [];
  const q: Record<string, unknown> = {
    from: () => q,
    innerJoin: () => q,
    where: (cond: SQL) => {
      rec.where = cond;
      return q;
    },
    orderBy: () => q,
    then: (resolve: (v: unknown) => unknown) => resolve(rows),
  };
  return q;
});
vi.mock("@/db", () => ({ db: { select: () => select() } }));

import { GET as projectsGET } from "@/app/api/admin/projects/route";
import { GET as statsGET } from "@/app/api/admin/stats/route";

const dialect = new PgDialect();
const render = (cond: SQL | undefined) => {
  expect(cond).toBeDefined();
  return dialect.sqlToQuery(cond as SQL);
};

const admin = { userId: 10, email: "a@x.io", role: "admin", name: "A" };

beforeEach(() => {
  getAuthUser.mockReset();
  getAdminDepartments.mockReset();
  select.mockClear();
  queries.length = 0;
  queued = [];
});

describe("GET /api/admin/projects", () => {
  it("401 without a session and runs no query", async () => {
    getAuthUser.mockResolvedValueOnce(null);
    const res = await projectsGET();
    expect(res.status).toBe(401);
    expect(getAdminDepartments).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
  });

  it.each(["student", "professor"])("403 for a %s and runs no query", async (role) => {
    getAuthUser.mockResolvedValueOnce({ ...admin, role });
    const res = await projectsGET();
    expect(res.status).toBe(403);
    expect(getAdminDepartments).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
  });

  it("Test 3: admin with no departments gets [] and the projects query never runs", async () => {
    getAuthUser.mockResolvedValueOnce(admin);
    getAdminDepartments.mockResolvedValueOnce([]);
    const res = await projectsGET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ projects: [] });
    expect(select).not.toHaveBeenCalled();
  });

  it("Test 1: filters by the creator's department, limited to THIS admin's departments", async () => {
    getAuthUser.mockResolvedValueOnce(admin);
    getAdminDepartments.mockResolvedValueOnce(["هوش مصنوعی"]);
    queued = [[{ id: 1, title: "P1" }]];
    const res = await projectsGET();
    expect(res.status).toBe(200);
    expect(getAdminDepartments).toHaveBeenCalledWith(10);
    expect(select).toHaveBeenCalledTimes(1);
    const { sql: text, params } = render(queries[0].where);
    // users.department is the creator's department (projects JOIN users ON creator_id)
    expect(text).toMatch(/"users"\."department" in \(\$1\)/);
    expect(params).toEqual(["هوش مصنوعی"]);
    expect(params).not.toContain("شبکه‌های کامپیوتری"); // department B never sent
  });

  it("passes every department of a multi-department admin, and only those", async () => {
    getAuthUser.mockResolvedValueOnce(admin);
    getAdminDepartments.mockResolvedValueOnce(["هوش مصنوعی", "علوم داده"]);
    queued = [[]];
    await projectsGET();
    const { sql: text, params } = render(queries[0].where);
    expect(text).toMatch(/"users"\."department" in \(\$1, \$2\)/);
    expect(params).toEqual(["هوش مصنوعی", "علوم داده"]);
  });
});

describe("GET /api/admin/stats", () => {
  const counts = (s: number, p: number, pr: number) => [
    [{ count: s }],
    [{ count: p }],
    [{ count: pr }],
  ];

  it("401 without a session and runs no query", async () => {
    getAuthUser.mockResolvedValueOnce(null);
    expect((await statsGET()).status).toBe(401);
    expect(select).not.toHaveBeenCalled();
  });

  it("403 for a non-admin and runs no query", async () => {
    getAuthUser.mockResolvedValueOnce({ ...admin, role: "student" });
    expect((await statsGET()).status).toBe(403);
    expect(select).not.toHaveBeenCalled();
  });

  it("Test 3: admin with no departments gets projects = 0 and no data query runs", async () => {
    getAuthUser.mockResolvedValueOnce(admin);
    // stats still loads the departments itself (inline) — that is ONE query on
    // admin_departments; the projects query must not run.
    queued = [[]];
    const res = await statsGET();
    const body = await res.json();
    expect(body).toEqual({ students: 0, professors: 0, projects: 0, departments: [] });
    expect(select).toHaveBeenCalledTimes(1); // only the admin_departments lookup
  });

  it("Test 2: the projects count is filtered to the admin's departments", async () => {
    getAuthUser.mockResolvedValueOnce(admin);
    // 1st query: admin_departments lookup; then students, professors, projects
    queued = [[{ department: "هوش مصنوعی" }], ...counts(4, 2, 3)];
    const res = await statsGET();
    const body = await res.json();
    expect(body).toMatchObject({ students: 4, professors: 2, projects: 3 });
    expect(select).toHaveBeenCalledTimes(4);
    const projectsQuery = queries[3];
    const { sql: text, params } = render(projectsQuery.where);
    expect(text).toMatch(/"users"\."department" in \(\$1\)/);
    expect(params).toEqual(["هوش مصنوعی"]);
  });
});
