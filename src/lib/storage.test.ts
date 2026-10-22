import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { blobPut, blobGet, blobDel } = vi.hoisted(() => ({ blobPut: vi.fn(), blobGet: vi.fn(), blobDel: vi.fn() }));
vi.mock("@vercel/blob", () => ({ put: blobPut, get: blobGet, del: blobDel }));

import { deleteFile, getS3Config, getStorageKind, openFile, saveFile } from "@/lib/storage";

// A tiny path-style S3 stand-in: PUT/GET/DELETE /<bucket>/<key>. It checks that requests are signed.
const objects = new Map<string, { body: Buffer; type: string }>();
const seen: Array<{ method: string; url: string; auth: string; headers: IncomingMessage["headers"] }> = [];
let server: Server;
let endpoint = "";

beforeAll(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const url = decodeURIComponent((req.url ?? "").split("?")[0]);
      seen.push({ method: req.method ?? "", url, auth: String(req.headers.authorization ?? ""), headers: req.headers });
      if (!String(req.headers.authorization ?? "").startsWith("AWS4-HMAC-SHA256")) { res.statusCode = 403; return res.end(); }
      if (req.method === "PUT") {
        objects.set(url, { body: Buffer.concat(chunks), type: String(req.headers["content-type"]) });
        res.setHeader("ETag", '"x"'); return res.end();
      }
      if (req.method === "GET") {
        const o = objects.get(url);
        if (!o) { res.statusCode = 404; res.setHeader("content-type", "application/xml"); return res.end("<Error><Code>NoSuchKey</Code><Message>x</Message></Error>"); }
        res.setHeader("content-type", o.type); res.setHeader("content-length", o.body.length); return res.end(o.body);
      }
      if (req.method === "DELETE") { objects.delete(url); res.statusCode = 204; return res.end(); }
      res.statusCode = 405; res.end();
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));
beforeEach(() => { objects.clear(); seen.length = 0; vi.clearAllMocks(); });

const s3Env = () => ({ S3_ENDPOINT: endpoint, S3_ACCESS_KEY: "AK", S3_SECRET_KEY: "SK", S3_BUCKET: "bkt" });
const KEY = "projects/8/chat/1700000000000-report.pdf";
const file = (content = "hello pdf", type = "application/pdf") => new File([content], "report.pdf", { type });

describe("config", () => {
  it("is null unless all four values are present", () => {
    expect(getS3Config({})).toBeNull();
    expect(getS3Config({ ...s3Env(), S3_SECRET_KEY: "" })).toBeNull();
    expect(getS3Config(s3Env())).toMatchObject({ bucket: "bkt", region: "default", forcePathStyle: true });
    expect(getS3Config({ ...s3Env(), S3_FORCE_PATH_STYLE: "false" })?.forcePathStyle).toBe(false);
  });
  it("rejects http (non-local), credentials in the URL and garbage", () => {
    expect(() => getS3Config({ ...s3Env(), S3_ENDPOINT: "http://storage.example.com" })).toThrow();
    expect(() => getS3Config({ ...s3Env(), S3_ENDPOINT: "https://u:p@storage.example.com" })).toThrow();
    expect(() => getS3Config({ ...s3Env(), S3_ENDPOINT: "not a url" })).toThrow();
    expect(getS3Config({ ...s3Env(), S3_ENDPOINT: "https://storage.example.com/" })?.endpoint).toBe("https://storage.example.com");
  });
  it("picks S3 over Blob, Blob when only the token exists, null otherwise", () => {
    expect(getStorageKind({ ...s3Env(), BLOB_READ_WRITE_TOKEN: "t" })).toBe("s3");
    expect(getStorageKind({ BLOB_READ_WRITE_TOKEN: "t" })).toBe("blob");
    expect(getStorageKind({})).toBeNull();
  });
});

describe("S3 driver against a local S3-style server", () => {
  it("uploads (signed, plain body), downloads the same bytes and type, then deletes", async () => {
    const ref = await saveFile(KEY, file("hello pdf"), s3Env());
    expect(ref).toBe(`s3:${KEY}`);
    expect(seen[0]).toMatchObject({ method: "PUT", url: `/bkt/${KEY}` });
    expect(seen[0].headers["content-encoding"]).toBeUndefined(); // no aws-chunked
    expect(seen[0].headers["x-amz-trailer"]).toBeUndefined();
    expect(objects.get(`/bkt/${KEY}`)?.type).toBe("application/pdf");

    const opened = await openFile(ref, s3Env());
    expect(opened).not.toBeNull();
    expect(opened!.contentType).toBe("application/pdf");
    expect(opened!.size).toBe(9);
    expect(Buffer.from(await new Response(opened!.stream).arrayBuffer()).toString()).toBe("hello pdf");

    await deleteFile(ref, s3Env());
    expect(objects.size).toBe(0);
    expect(await openFile(ref, s3Env())).toBeNull(); // NoSuchKey -> null, not an exception
  });

  it("never sends the secret key", async () => {
    await saveFile(KEY, file(), s3Env());
    for (const r of seen) expect(JSON.stringify(r)).not.toContain("SK\"");
    expect(seen[0].url).not.toContain("SK");
  });

  it("refuses keys the app would never create (no path tricks, no other prefixes)", async () => {
    for (const bad of ["../x", "projects/8/chat/../../x", "other/8/chat/a.pdf", "projects/8/secret/a.pdf", "projects/x/chat/a.pdf", "projects/8/chat/a b.pdf"]) {
      await expect(saveFile(bad, file(), s3Env())).rejects.toThrow();
    }
    for (const bad of ["s3:../x", "s3:projects/8/chat/../../x", "s3:other/a.pdf", "s3:"]) {
      await expect(openFile(bad, s3Env())).rejects.toThrow();
      await expect(deleteFile(bad, s3Env())).rejects.toThrow();
    }
    expect(seen.length).toBe(0);
  });

  it("surfaces real storage errors (e.g. wrong credentials) instead of hiding them", async () => {
    server.once("request", () => {});
    const broken = { ...s3Env(), S3_ENDPOINT: "http://127.0.0.1:1" };
    await expect(saveFile(KEY, file(), broken)).rejects.toThrow();
  });
});

describe("legacy Blob references and the Blob driver", () => {
  it("opens and deletes old https refs through Blob, not S3", async () => {
    blobGet.mockResolvedValueOnce({ statusCode: 200, stream: new Response("x").body, blob: { contentType: "image/png", size: 1 } });
    const o = await openFile("https://abc.public.blob.vercel-storage.com/projects/1/chat/a.png", s3Env());
    expect(o).toMatchObject({ contentType: "image/png", size: 1 });
    await deleteFile("https://abc.public.blob.vercel-storage.com/projects/1/chat/a.png", s3Env());
    expect(blobDel).toHaveBeenCalledOnce();
    expect(seen.length).toBe(0);
  });
  it("returns null when Blob says not found", async () => {
    blobGet.mockResolvedValueOnce(null);
    expect(await openFile("https://x/y", {})).toBeNull();
  });
  it("uploads to Blob only when S3 is not configured", async () => {
    blobPut.mockResolvedValueOnce({ url: "https://abc.blob/x.pdf" });
    expect(await saveFile(KEY, file(), { BLOB_READ_WRITE_TOKEN: "t" })).toBe("https://abc.blob/x.pdf");
    await expect(saveFile(KEY, file(), {})).rejects.toThrow(/not configured/);
  });
});
