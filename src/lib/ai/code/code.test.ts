import { describe, expect, it } from "vitest";
import { checkPath, redactCode } from "@/lib/ai/code/pathPolicy";
import { CodeAccessError, createGithubReader, validateRepoConfig } from "@/lib/ai/code/githubReader";

describe("checkPath: allowed", () => {
  it.each([
    ["src/app/dashboard/projects/[id]/page.tsx", "file"],
    ["src/lib/validation.ts", "file"],
    ["src/components/projects/ProjectFiles.tsx", "file"],
    ["src/lib", "dir"],
    ["src/lib/", "dir"],
    ["src", "dir"],
  ] as const)("%s", (p, kind) => {
    expect(checkPath(p, kind).ok).toBe(true);
  });
});

describe("checkPath: attacks are denied", () => {
  const attacks: Array<[string, string]> = [
    [".env", "outside_src"], [".env.local", "outside_src"], ["src/.env.local", "forbidden_name"],
    ["src/../.env", "traversal_or_empty_segment"], ["src/lib/../../.env", "traversal_or_empty_segment"],
    ["src/./lib/a.ts", "traversal_or_empty_segment"], ["src//lib/a.ts", "traversal_or_empty_segment"],
    ["/etc/passwd", "absolute_path"], ["C:\\Windows\\win.ini", "bad_characters"], ["src\\lib\\a.ts", "bad_characters"],
    ["src/%2e%2e/.env", "bad_characters"], ["src/lib/a.ts%00.png", "bad_characters"], ["src/lib/a.ts\u0000", "bad_characters"],
    ["src/lib/ا.ts", "bad_characters"], ["src/lib/a b.ts", "bad_characters"],
    ["package.json", "outside_src"], ["scripts/ai-budget.mjs", "outside_src"], [".github/workflows/triage.yml", "outside_src"],
    ["drizzle/0001.sql", "outside_src"], ["src/db/migrations/0001.ts", "forbidden_name"],
    ["src/lib/secrets.ts", "forbidden_name"], ["src/lib/auth/token.ts", "forbidden_name"], ["src/lib/PASSWORD.ts", "forbidden_name"],
    ["src/keys/server.pem", "forbidden_name"], ["src/db/seed.ts", "forbidden_name"],
    ["src/lib/image.png", "extension_not_allowed"], ["src/lib/a.sql", "extension_not_allowed"], ["src/lib/Makefile", "extension_not_allowed"],
    ["src/node_modules/x/index.js", "forbidden_name"], ["src/.git/config", "forbidden_name"],
    ["", "bad_length"], ["a".repeat(500), "bad_length"],
  ];
  it.each(attacks)("%j -> %s", (p, reason) => {
    const v = checkPath(p, "file");
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe(reason);
  });
  it("rejects non-strings", () => {
    for (const x of [null, undefined, 5, {}, ["src/a.ts"]]) expect(checkPath(x, "file").ok).toBe(false);
  });
  it("is case-insensitive for sensitive names and extensions", () => {
    expect(checkPath("src/lib/SeCrEt.ts", "file").ok).toBe(false);
    expect(checkPath("src/lib/a.PNG", "file").ok).toBe(false);
    expect(checkPath("src/.ENV", "file").ok).toBe(false);
  });
});

describe("redactCode", () => {
  it("removes secret-looking literals but keeps normal code", () => {
    const out = redactCode([
      'const url = "postgres://user:pass@host/db";',
      'const k = "sk-abcdefghijklmnop1234";',
      'const h = "Authorization: Bearer abcdefghijklmnopqrst";',
      'const long = "' + "A1b2".repeat(15) + '";',
      "-----BEGIN RSA PRIVATE KEY-----\nMIIB\n-----END RSA PRIVATE KEY-----",
      "const a = process.env.FOO ?? obj.deep.member;",
    ].join("\n"));
    for (const bad of ["user:pass", "abcdefghijklmnop1234", "abcdefghijklmnopqrst", "A1b2A1b2A1b2", "MIIB"]) expect(out).not.toContain(bad);
    expect(out).toContain("process.env.FOO ?? obj.deep.member");
  });
});

function fakeFetch(routes: Record<string, { status?: number; body: unknown }>, seen: Array<{ url: string; init?: RequestInit }> = []) {
  return (async (url: string, init?: RequestInit) => {
    seen.push({ url, init });
    const key = Object.keys(routes).find((k) => url.includes(k));
    if (!key) return new Response("{}", { status: 404 });
    const r = routes[key];
    return new Response(JSON.stringify(r.body), { status: r.status ?? 200 });
  }) as unknown as typeof fetch;
}
const b64 = (s: string | Buffer) => Buffer.from(s).toString("base64");
const base = { token: "ghp_TESTTOKEN", repo: "me/repo", branch: "main" };

describe("repo config validation", () => {
  it("rejects odd repo and branch values", () => {
    for (const r of ["x", "a/b/c", "../x/y", "me/re po", "me/repo?x=1", "me/..", ""]) expect(() => validateRepoConfig(r, "main"), r).toThrow(CodeAccessError);
    for (const b of ["", "../x", "-rf", "/abs", "a b", "main?x"]) expect(() => validateRepoConfig("me/repo", b), b).toThrow(CodeAccessError);
    expect(() => validateRepoConfig("me/repo", "feature/x-1")).not.toThrow();
  });
});

describe("github reader", () => {
  it("reads a file, redacts, sends the token only in the header", async () => {
    const seen: Array<{ url: string; init?: RequestInit }> = [];
    const reader = createGithubReader({
      ...base,
      fetchImpl: fakeFetch({ "contents/src/lib/a.ts": { body: { type: "file", encoding: "base64", content: b64('const x = "postgres://u:p@h/d";\nexport {}') } } }, seen),
    });
    const r = await reader.readFile("src/lib/a.ts");
    expect(r.content).toContain("export {}");
    expect(r.content).not.toContain("u:p@h");
    expect(seen[0].url).not.toContain("ghp_TESTTOKEN");
    expect((seen[0].init!.headers as Record<string, string>).Authorization).toBe("Bearer ghp_TESTTOKEN");
  });

  it("never calls GitHub for a forbidden path", async () => {
    const seen: Array<{ url: string }> = [];
    const reader = createGithubReader({ ...base, fetchImpl: fakeFetch({}, seen) });
    for (const p of [".env", "src/../.env", "src/lib/secrets.ts", "package.json", "src/%2e%2e/x.ts"]) {
      await expect(reader.readFile(p)).rejects.toThrow(/^path_/);
    }
    await expect(reader.listDir("scripts")).rejects.toThrow(/^path_/);
    expect(seen.length).toBe(0);
  });

  it("refuses symlinks, submodules, directories-as-files and binary content", async () => {
    const mk = (body: unknown) => createGithubReader({ ...base, fetchImpl: fakeFetch({ "contents/": { body } }) });
    await expect(mk({ type: "symlink", target: "../../.env" }).readFile("src/a.ts")).rejects.toThrow("not_a_file");
    await expect(mk({ type: "submodule" }).readFile("src/a.ts")).rejects.toThrow("not_a_file");
    await expect(mk([{ name: "x", type: "file" }]).readFile("src/a.ts")).rejects.toThrow("not_a_file");
    await expect(mk({ type: "file", encoding: "base64", content: b64(Buffer.from([1, 0, 2])) }).readFile("src/a.ts")).rejects.toThrow("binary_file");
  });

  it("truncates large files", async () => {
    const reader = createGithubReader({ ...base, fetchImpl: fakeFetch({ "contents/": { body: { type: "file", encoding: "base64", content: b64("a".repeat(100_000)) } } }) });
    const r = await reader.readFile("src/a.ts");
    expect(r.truncated).toBe(true);
    expect(r.content.length).toBeLessThanOrEqual(40_000);
  });

  it("lists a directory but hides sensitive entries, symlinks and unsafe names", async () => {
    const reader = createGithubReader({
      ...base,
      fetchImpl: fakeFetch({
        "contents/src/lib": {
          body: [
            { name: "validation.ts", type: "file" }, { name: "ai", type: "dir" }, { name: "secrets.ts", type: "file" },
            { name: ".env.local", type: "file" }, { name: "link", type: "symlink" }, { name: "logo.png", type: "file" },
            { name: "migrations", type: "dir" }, { name: "my file.ts", type: "file" },
          ],
        },
      }),
    });
    const r = await reader.listDir("src/lib");
    expect(r.entries.map((e) => e.name).sort()).toEqual(["ai", "validation.ts"]);
  });

  it("maps GitHub failures to safe codes without leaking token or body", async () => {
    for (const [status, code] of [[404, "not_found"], [401, "github_denied"], [403, "github_denied"], [500, "github_http_500"]] as const) {
      const reader = createGithubReader({ ...base, fetchImpl: fakeFetch({ "contents/": { status, body: { message: "token ghp_TESTTOKEN bad", secret: "x" } } }) });
      const err = await reader.readFile("src/a.ts").catch((e) => e);
      expect(err).toBeInstanceOf(CodeAccessError);
      expect(err.message).toBe(code);
      expect(JSON.stringify(err)).not.toContain("ghp_");
    }
    const down = createGithubReader({ ...base, fetchImpl: (async () => { throw new Error("connect ghp_TESTTOKEN"); }) as unknown as typeof fetch });
    const err = await down.readFile("src/a.ts").catch((e) => e);
    expect(err.message).toBe("network_error");
  });

  it("requires a token", () => {
    expect(() => createGithubReader({ ...base, token: "" })).toThrow("missing_token");
  });
});
