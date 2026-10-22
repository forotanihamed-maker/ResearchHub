// src/lib/storage.ts
//
// File storage behind one small interface, so the app can leave Vercel Blob.
//
// What is stored in project_files.file_url (no schema change):
//   "s3:<key>"        -> object in an S3-compatible bucket (Liara, Arvan, MinIO ...)
//   "https://..."     -> legacy Vercel Blob URL (still readable/deletable while it exists)
//
// New uploads go to S3 when S3_* is configured, otherwise to Blob when
// BLOB_READ_WRITE_TOKEN is set (the old behaviour), otherwise the upload is refused.
// Downloads never expose a storage URL: the app route checks project membership and
// streams the bytes.
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { del as blobDel, get as blobGet, put as blobPut } from "@vercel/blob";

type Env = Record<string, string | undefined>;

export const S3_PREFIX = "s3:";
const KEY_RE = /^projects\/\d{1,10}\/(?:chat|document|deliverable)\/[A-Za-z0-9._-]{1,200}$/;

export interface S3Config {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
  forcePathStyle: boolean;
}

/** null when S3 is not (completely) configured. Throws on a malformed endpoint. */
export function getS3Config(env: Env = process.env): S3Config | null {
  const endpoint = (env.S3_ENDPOINT ?? "").trim();
  const accessKey = (env.S3_ACCESS_KEY ?? "").trim();
  const secretKey = (env.S3_SECRET_KEY ?? "").trim();
  const bucket = (env.S3_BUCKET ?? "").trim();
  if (!endpoint || !accessKey || !secretKey || !bucket) return null;
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("S3_ENDPOINT is not a valid URL");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || !(url.protocol === "https:" || (url.protocol === "http:" && local))) {
    throw new Error("S3_ENDPOINT must be https (http only for localhost) without credentials");
  }
  return {
    endpoint: url.origin + url.pathname.replace(/\/+$/, ""),
    accessKey,
    secretKey,
    bucket,
    region: (env.S3_REGION ?? "default").trim() || "default",
    forcePathStyle: (env.S3_FORCE_PATH_STYLE ?? "true").trim().toLowerCase() !== "false",
  };
}

export type StorageKind = "s3" | "blob";

/** Where NEW uploads go; null = storage is not configured. */
export function getStorageKind(env: Env = process.env): StorageKind | null {
  if (getS3Config(env)) return "s3";
  if (env.BLOB_READ_WRITE_TOKEN) return "blob";
  return null;
}

const clients = new Map<string, S3Client>();
function s3Client(cfg: S3Config): S3Client {
  const id = `${cfg.endpoint}|${cfg.accessKey}|${cfg.region}|${cfg.forcePathStyle}`;
  let c = clients.get(id);
  if (!c) {
    c = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      forcePathStyle: cfg.forcePathStyle,
      // Many S3-compatible servers (older MinIO, Ceph, local providers) reject the SDK's
      // default "always add a checksum / chunked trailer" behaviour. Only when required.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      credentials: { accessKeyId: cfg.accessKey, secretAccessKey: cfg.secretKey },
    });
    clients.set(id, c);
  }
  return c;
}

function requireS3(env: Env): S3Config {
  const cfg = getS3Config(env);
  if (!cfg) throw new Error("S3 storage is not configured");
  return cfg;
}

/** Only keys this app creates are ever read or deleted (a tampered DB row cannot reach other objects). */
function keyOf(ref: string): string {
  const key = ref.slice(S3_PREFIX.length);
  if (!KEY_RE.test(key)) throw new Error("invalid storage key");
  return key;
}

/** Stores a file and returns the value for project_files.file_url. */
export async function saveFile(key: string, file: File, env: Env = process.env): Promise<string> {
  const kind = getStorageKind(env);
  if (kind === "s3") {
    const cfg = requireS3(env);
    if (!KEY_RE.test(key)) throw new Error("invalid storage key");
    await s3Client(cfg).send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: file.type || "application/octet-stream",
        ContentLength: file.size,
      }),
    );
    return `${S3_PREFIX}${key}`;
  }
  if (kind === "blob") {
    const blob = await blobPut(key, file, { access: "public", addRandomSuffix: true });
    return blob.url;
  }
  throw new Error("file storage is not configured");
}

export interface OpenedFile {
  stream: ReadableStream<Uint8Array>;
  contentType: string;
  size: number | null;
}

/** Opens a stored file for download; null when the object does not exist. */
export async function openFile(ref: string, env: Env = process.env): Promise<OpenedFile | null> {
  if (ref.startsWith(S3_PREFIX)) {
    const cfg = requireS3(env);
    try {
      const out = await s3Client(cfg).send(new GetObjectCommand({ Bucket: cfg.bucket, Key: keyOf(ref) }));
      if (!out.Body) return null;
      return {
        stream: out.Body.transformToWebStream() as ReadableStream<Uint8Array>,
        contentType: out.ContentType || "application/octet-stream",
        size: typeof out.ContentLength === "number" ? out.ContentLength : null,
      };
    } catch (error) {
      if ((error as { name?: string }).name === "NoSuchKey") return null;
      throw error;
    }
  }
  const result = await blobGet(ref, { access: "private" });
  if (!result || result.statusCode !== 200) return null;
  return {
    stream: result.stream as ReadableStream<Uint8Array>,
    contentType: result.blob.contentType || "application/octet-stream",
    size: result.blob.size ?? null,
  };
}

/** Deletes a stored file. Throws on failure; callers decide whether that blocks them. */
export async function deleteFile(ref: string, env: Env = process.env): Promise<void> {
  if (ref.startsWith(S3_PREFIX)) {
    const cfg = requireS3(env);
    await s3Client(cfg).send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: keyOf(ref) }));
    return;
  }
  await blobDel(ref);
}
