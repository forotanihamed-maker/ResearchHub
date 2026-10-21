import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getDevApiUser, update, execute } = vi.hoisted(() => ({
  getDevApiUser: vi.fn(),
  update: vi.fn(),
  execute: vi.fn(),
}));

vi.mock("@/lib/devAccess", () => ({
  getDevApiUser,
  devNotFoundResponse: () => new Response(null, { status: 404 }),
}));
vi.mock("@/db", () => ({ db: { update, execute, select: vi.fn() } }));
vi.mock("@/lib/ai/budget", () => ({
  ensureBudgetRow: vi.fn(),
  getBudgetStatus: vi.fn().mockResolvedValue(null),
  setKillSwitch: vi.fn(),
}));

import { GET as listGet } from "@/app/api/dev/tasks/route";
import { GET as oneGet, PATCH as onePatch } from "@/app/api/dev/tasks/[id]/route";
import { GET as promptGet } from "@/app/api/dev/tasks/[id]/prompt/route";
import { GET as budgetGet, PATCH as budgetPatch } from "@/app/api/dev/budget/route";
import { setKillSwitch } from "@/lib/ai/budget";

const req = (body?: unknown, raw?: string) =>
  new NextRequest("http://x/api/dev/x", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: raw ?? JSON.stringify(body),
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("dev panel API guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for everyone not allowed, on every route and method", async () => {
    getDevApiUser.mockResolvedValue(null);
    expect((await listGet(new NextRequest("http://x/api/dev/tasks"))).status).toBe(404);
    expect((await oneGet(req(), ctx("1"))).status).toBe(404);
    expect((await onePatch(req({ status: "resolved" }), ctx("1"))).status).toBe(404);
    expect((await promptGet(req(), ctx("1"))).status).toBe(404);
    expect((await budgetGet()).status).toBe(404);
    expect((await budgetPatch(req({ killSwitch: true }))).status).toBe(404);
    expect(update).not.toHaveBeenCalled();
    expect(setKillSwitch).not.toHaveBeenCalled();
  });

  it("validates input before touching the database", async () => {
    getDevApiUser.mockResolvedValue({ userId: 1, email: "a@b.c", role: "admin" });
    expect((await onePatch(req({ status: "deleted" }), ctx("1"))).status).toBe(400);
    expect((await onePatch(req({}), ctx("1"))).status).toBe(400);
    expect((await onePatch(req(null, "{bad"), ctx("1"))).status).toBe(400);
    expect((await onePatch(req({ status: "open" }), ctx("abc"))).status).toBe(400);
    expect((await onePatch(req({ status: "open" }), ctx("-3"))).status).toBe(400);
    expect((await promptGet(req(), ctx("abc"))).status).toBe(400);
    expect((await budgetPatch(req({ killSwitch: "yes" }))).status).toBe(400);
    expect((await budgetPatch(req({ cap: 9999 }))).status).toBe(400);
    expect(update).not.toHaveBeenCalled();
    expect(setKillSwitch).not.toHaveBeenCalled();
  });
});
