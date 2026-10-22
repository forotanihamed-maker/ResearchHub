import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
  getProjectAccess: vi.fn(),
  getStorageKind: vi.fn(),
  saveFile: vi.fn(),
  openFile: vi.fn(),
  deleteFile: vi.fn(),
  reportServerError: vi.fn(),
  checkRateLimit: vi.fn(),
  inserted: [] as unknown[],
  selectRows: [] as unknown[][],
}));

vi.mock("@/lib/auth", () => ({ getAuthUser: m.getAuthUser }));
vi.mock("@/lib/projectAccess", () => ({ getProjectAccess: m.getProjectAccess }));
vi.mock("@/lib/storage", () => ({ getStorageKind: m.getStorageKind, saveFile: m.saveFile, openFile: m.openFile, deleteFile: m.deleteFile }));
vi.mock("@/lib/errorCapture", () => ({ reportServerError: m.reportServerError }));
vi.mock("@/lib/rateLimit", () => ({ checkRateLimit: m.checkRateLimit }));
vi.mock("@/lib/auditLog", () => ({ auditLog: vi.fn() }));
vi.mock("@/db", () => {
  const rows = () => Promise.resolve(m.selectRows.shift() ?? []);
  const chain = (): Record<string, unknown> => {
    const c: Record<string, unknown> = {};
    c.from = () => c; c.where = () => c; c.orderBy = () => c; c.leftJoin = () => c; c.innerJoin = () => c;
    c.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => rows().then(res, rej);
    return c;
  };
  return {
    db: {
      select: () => chain(),
      insert: () => ({ values: (v: unknown) => { m.inserted.push(v); return { returning: () => Promise.resolve([{ id: 99, ...(v as object) }]) }; } }),
      delete: () => ({ where: () => Promise.resolve() }),
    },
  };
});

import { POST } from "@/app/api/projects/[id]/files/route";
import { DELETE, GET } from "@/app/api/projects/[id]/files/[fileId]/route";

const ctx = { params: Promise.resolve({ id: "8" }) };
const fileCtx = { params: Promise.resolve({ id: "8", fileId: "5" }) };
const upload = (name = "a.pdf", type = "application/pdf", content = "pdf-bytes") => {
  const fd = new FormData();
  fd.append("file", new File([content], name, { type }));
  fd.append("context", "document");
  return new NextRequest("http://x/api/projects/8/files", { method: "POST", body: fd });
};

beforeEach(() => {
  vi.clearAllMocks();
  m.inserted.length = 0; m.selectRows.length = 0;
  m.getAuthUser.mockResolvedValue({ userId: 3 });
  m.getProjectAccess.mockResolvedValue({ project: { id: 8, status: "active" }, isOwner: false, isMember: true });
  m.getStorageKind.mockReturnValue("s3");
  m.checkRateLimit.mockReturnValue({ allowed: true, resetAt: Date.now() + 1000 });
  m.saveFile.mockResolvedValue("s3:projects/8/document/1-a.pdf");
});

describe("POST /api/projects/:id/files", () => {
  it("stores the file through the storage layer and saves the returned reference", async () => {
    m.selectRows.push([{ name: "Ali" }]); // uploader name lookup
    const res = await POST(upload(), ctx);
    expect(res.status).toBe(201);
    expect(m.saveFile).toHaveBeenCalledOnce();
    const [key, file] = m.saveFile.mock.calls[0];
    expect(key).toMatch(/^projects\/8\/document\/\d+-a\.pdf$/);
    expect((file as File).name).toBe("a.pdf");
    expect(m.inserted[0]).toMatchObject({ projectId: 8, uploaderId: 3, fileUrl: "s3:projects/8/document/1-a.pdf", fileSize: 9 });
  });

  it("sanitises hostile file names in the storage key", async () => {
    m.selectRows.push([{ name: "Ali" }]);
    await POST(upload("../../etc/pass wd?.pdf"), ctx);
    expect(m.saveFile.mock.calls[0][0]).toMatch(/^projects\/8\/document\/\d+-[A-Za-z0-9._-]+\.pdf$/);
  });

  it("a very long file name is shortened (extension kept) so the storage key stays valid", async () => {
    m.selectRows.push([{ name: "Ali" }]);
    const res = await POST(upload(`${"a".repeat(400)}.pdf`), ctx);
    expect(res.status).toBe(201);
    const key = m.saveFile.mock.calls[0][0] as string;
    expect(key.endsWith(".pdf")).toBe(true);
    expect(key.length).toBeLessThan(160);
  });

  it("answers 500 'not configured' when no storage is set up, and does not touch storage", async () => {
    m.getStorageKind.mockReturnValue(null);
    const res = await POST(upload(), ctx);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("File storage is not configured");
    expect(m.saveFile).not.toHaveBeenCalled();
  });

  it("reports the real storage failure to the error log and returns a generic 500", async () => {
    m.saveFile.mockRejectedValueOnce(new Error("AccessDenied: bucket"));
    const res = await POST(upload(), ctx);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
    expect(m.reportServerError).toHaveBeenCalledOnce();
    expect(String(m.reportServerError.mock.calls[0][0])).toContain("/api/projects/");
    expect(m.inserted.length).toBe(0); // nothing saved in the DB when the upload failed
  });

  it("still validates before storage: wrong type, empty file, not a member", async () => {
    expect((await POST(upload("a.exe", "application/x-msdownload"), ctx)).status).toBe(400);
    expect((await POST(upload("a.pdf", "application/pdf", ""), ctx)).status).toBe(400);
    m.getProjectAccess.mockResolvedValueOnce({ project: { id: 8 }, isOwner: false, isMember: false });
    expect((await POST(upload(), ctx)).status).toBe(403);
    expect(m.saveFile).not.toHaveBeenCalled();
  });

  it("accepts a zip with the Windows MIME type", async () => {
    m.selectRows.push([{ name: "Ali" }]);
    expect((await POST(upload("code.zip", "application/x-zip-compressed"), ctx)).status).toBe(201);
  });
});

describe("GET/DELETE /api/projects/:id/files/:fileId", () => {
  const row = { id: 5, projectId: 8, uploaderId: 3, fileName: "گزارش.pdf", fileUrl: "s3:projects/8/document/1-a.pdf", fileSize: 9 };

  it("streams the download with safe headers and never exposes the storage reference", async () => {
    m.selectRows.push([row]);
    m.openFile.mockResolvedValueOnce({ stream: new Response("pdf-bytes").body, contentType: "application/pdf", size: 9 });
    const res = await GET(new NextRequest("http://x"), fileCtx);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-length")).toBe("9");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect(JSON.stringify([...res.headers.entries()])).not.toContain("s3:");
    expect(await res.text()).toBe("pdf-bytes");
    expect(m.openFile).toHaveBeenCalledWith("s3:projects/8/document/1-a.pdf");
  });

  it("404 when the object is gone from storage; 403 for non-members", async () => {
    m.selectRows.push([row]);
    m.openFile.mockResolvedValueOnce(null);
    expect((await GET(new NextRequest("http://x"), fileCtx)).status).toBe(404);
    m.getProjectAccess.mockResolvedValueOnce({ project: { id: 8 }, isOwner: false, isMember: false });
    expect((await GET(new NextRequest("http://x"), fileCtx)).status).toBe(403);
    expect(m.openFile).toHaveBeenCalledTimes(1);
  });

  it("delete: uploader may delete; storage failure does not block removing the record", async () => {
    m.selectRows.push([row]);
    m.deleteFile.mockRejectedValueOnce(new Error("gone"));
    const res = await DELETE(new NextRequest("http://x", { method: "DELETE" }), fileCtx);
    expect(res.status).toBe(200);
    expect(m.deleteFile).toHaveBeenCalledWith("s3:projects/8/document/1-a.pdf");
  });

  it("delete: a stranger who is neither uploader nor owner gets 403 and nothing is deleted", async () => {
    m.selectRows.push([{ ...row, uploaderId: 77 }]);
    const res = await DELETE(new NextRequest("http://x", { method: "DELETE" }), fileCtx);
    expect(res.status).toBe(403);
    expect(m.deleteFile).not.toHaveBeenCalled();
  });
});
