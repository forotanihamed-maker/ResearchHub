// src/lib/ai/code/githubReader.ts
//
// Read-only access to ONE repository/branch through the GitHub contents API.
// - Every path passes checkPath() first; nothing else decides what is readable.
// - The token only goes into the Authorization header: never into a URL, a log
//   line or an error message, and response bodies are never echoed.
// - Only plain files are returned (symlinks/submodules are refused), size is
//   capped, and content is passed through redactCode().
import { MAX_READ_BYTES, checkPath, entryVisible, redactCode } from "@/lib/ai/code/pathPolicy";

export class CodeAccessError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "CodeAccessError";
  }
}

export interface GithubReaderOptions {
  token: string;
  repo: string; // "owner/name"
  branch: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

const REPO_RE = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const BRANCH_RE = /^[A-Za-z0-9_.\/-]{1,100}$/;

export function validateRepoConfig(repo: string, branch: string): void {
  if (!REPO_RE.test(repo) || repo.includes("..")) throw new CodeAccessError("bad_repo");
  if (!BRANCH_RE.test(branch) || branch.includes("..") || branch.startsWith("/") || branch.startsWith("-")) {
    throw new CodeAccessError("bad_branch");
  }
}

export interface ReadResult { path: string; content: string; truncated: boolean }
export interface ListEntry { name: string; type: "file" | "dir" }

export function createGithubReader(opts: GithubReaderOptions) {
  validateRepoConfig(opts.repo, opts.branch);
  if (!opts.token) throw new CodeAccessError("missing_token");
  const doFetch = opts.fetchImpl ?? fetch;

  async function get(path: string): Promise<unknown> {
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    const url = `https://api.github.com/repos/${opts.repo}/contents/${encoded}?ref=${encodeURIComponent(opts.branch)}`;
    let res: Response;
    try {
      res = await doFetch(url, {
        headers: {
          Authorization: `Bearer ${opts.token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "researchhub-dev-assistant",
        },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
        redirect: "error",
      });
    } catch {
      throw new CodeAccessError("network_error");
    }
    if (res.status === 404) throw new CodeAccessError("not_found");
    if (res.status === 401 || res.status === 403) throw new CodeAccessError("github_denied");
    if (!res.ok) throw new CodeAccessError(`github_http_${res.status}`);
    try {
      return await res.json();
    } catch {
      throw new CodeAccessError("bad_response");
    }
  }

  return {
    async readFile(input: unknown): Promise<ReadResult> {
      const v = checkPath(input, "file");
      if (!v.ok) throw new CodeAccessError(`path_${v.reason}`);
      const data = await get(v.path);
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new CodeAccessError("not_a_file");
      const f = data as { type?: unknown; encoding?: unknown; content?: unknown; size?: unknown };
      if (f.type !== "file" || f.encoding !== "base64" || typeof f.content !== "string") throw new CodeAccessError("not_a_file");
      const buf = Buffer.from(f.content, "base64");
      if (buf.includes(0)) throw new CodeAccessError("binary_file");
      const truncated = buf.length > MAX_READ_BYTES;
      const text = buf.subarray(0, MAX_READ_BYTES).toString("utf8");
      return { path: v.path, content: redactCode(text), truncated };
    },

    async listDir(input: unknown): Promise<{ path: string; entries: ListEntry[] }> {
      const v = checkPath(input, "dir");
      if (!v.ok) throw new CodeAccessError(`path_${v.reason}`);
      const data = await get(v.path);
      if (!Array.isArray(data)) throw new CodeAccessError("not_a_directory");
      const entries: ListEntry[] = [];
      for (const e of data.slice(0, 500)) {
        if (!e || typeof e !== "object") continue;
        const { name, type } = e as { name?: unknown; type?: unknown };
        if (typeof name !== "string" || typeof type !== "string") continue;
        if (!entryVisible(v.path, name, type)) continue;
        entries.push({ name, type: type as "file" | "dir" });
      }
      return { path: v.path, entries };
    },
  };
}
