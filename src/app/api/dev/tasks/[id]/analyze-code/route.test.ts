import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getDevApiUser, execute, loadTaskDetail } = vi.hoisted(() => ({ getDevApiUser: vi.fn(), execute: vi.fn(), loadTaskDetail: vi.fn() }));
vi.mock("@/lib/devAccess", () => ({ getDevApiUser, devNotFoundResponse: () => new Response(null, { status: 404 }) }));
vi.mock("@/db", () => ({ db: { execute, insert: vi.fn(), update: vi.fn() } }));
vi.mock("@/lib/devTaskDetail", () => ({ loadTaskDetail }));
vi.mock("@/lib/ai/budget", () => ({ ensureBudgetRow: vi.fn(), reserve: vi.fn(), settle: vi.fn(), costUsd: () => 0, estimateInputTokens: () => 0 }));

import { POST } from "@/app/api/dev/tasks/[id]/analyze-code/route";

const req = () => new NextRequest("http://x/api/dev/tasks/1/analyze-code", { method: "POST" });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const ENV_KEYS = ["AI_ENABLED", "AI_PROVIDER", "GITHUB_READ_TOKEN", "GITHUB_REPO", "GITHUB_BRANCH"];

describe("POST /api/dev/tasks/:id/analyze-code guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of ENV_KEYS) delete process.env[k];
    getDevApiUser.mockResolvedValue({ userId: 1, email: "a@b.c", role: "admin" });
  });

  it("is a 404 for anyone who is not the owner, and does nothing", async () => {
    getDevApiUser.mockResolvedValue(null);
    expect((await POST(req(), ctx("1"))).status).toBe(404);
    expect(loadTaskDetail).not.toHaveBeenCalled();
  });
  it("400 for a bad id", async () => {
    expect((await POST(req(), ctx("abc"))).status).toBe(400);
  });
  it("503 when AI is off", async () => {
    process.env.AI_ENABLED = "false";
    expect((await POST(req(), ctx("1"))).status).toBe(503);
    expect(loadTaskDetail).not.toHaveBeenCalled();
  });
  it("503 when code access is not configured (no model call, no DB)", async () => {
    process.env.AI_ENABLED = "true";
    const res = await POST(req(), ctx("1"));
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain("GITHUB_READ_TOKEN");
    expect(loadTaskDetail).not.toHaveBeenCalled();
  });
  it("503 on a malformed repo setting", async () => {
    process.env.AI_ENABLED = "true";
    process.env.GITHUB_READ_TOKEN = "t"; process.env.GITHUB_REPO = "../evil";
    expect((await POST(req(), ctx("1"))).status).toBe(503);
  });
  it("404 for an unknown task, 429 while another analysis ran in the last 90 seconds", async () => {
    process.env.AI_ENABLED = "true"; process.env.GITHUB_READ_TOKEN = "t"; process.env.GITHUB_REPO = "me/repo";
    loadTaskDetail.mockResolvedValueOnce(null);
    expect((await POST(req(), ctx("1"))).status).toBe(404);
    loadTaskDetail.mockResolvedValueOnce({ task: {}, sources: [] });
    execute.mockResolvedValueOnce({ rows: [{ "?column?": 1 }] });
    expect((await POST(req(), ctx("1"))).status).toBe(429);
  });
});
