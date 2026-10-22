import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {}, pool: {} }));

import manifest from "@/lib/ai/routeManifest.json";
import { KEYWORD_FILES, fileForRoute, normalizeText, suggestFiles } from "@/lib/ai/fileHints";
import { buildFixPrompt } from "@/lib/ai/fixPrompt";

function scan(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...scan(full));
    else if (/^(page|route)\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out.sort();
}

describe("route manifest", () => {
  it("is up to date with src/app (run: node scripts/gen-route-manifest.mjs)", () => {
    expect(manifest).toEqual(scan("src/app"));
  });
  it("every file named in the keyword table exists", () => {
    for (const group of KEYWORD_FILES) {
      for (const file of group.files) {
        expect(existsSync(join(process.cwd(), file)), `${file} (${group.label})`).toBe(true);
      }
    }
  });
});

describe("fileForRoute", () => {
  it("maps dynamic pages and API routes", () => {
    expect(fileForRoute("/dashboard/projects/4")).toBe("src/app/dashboard/projects/[id]/page.tsx");
    expect(fileForRoute("/dashboard/projects")).toBe("src/app/dashboard/projects/page.tsx");
    expect(fileForRoute("/api/projects/4/files")).toBe("src/app/api/projects/[id]/files/route.ts");
    expect(fileForRoute("/api/projects/4/files/9")).toBe("src/app/api/projects/[id]/files/[fileId]/route.ts");
  });
  it("ignores query strings and prefers static over dynamic segments", () => {
    expect(fileForRoute("/dashboard/projects/4?tab=files")).toBe("src/app/dashboard/projects/[id]/page.tsx");
    expect(fileForRoute("/api/auth/login")).toBe("src/app/api/auth/login/route.ts");
  });
  it("returns null for unknown or hostile input, never a made-up path", () => {
    expect(fileForRoute("/nope/nothing")).toBeNull();
    expect(fileForRoute("")).toBeNull();
    expect(fileForRoute("/../../etc/passwd")).toBeNull();
    expect(fileForRoute("/api/projects/../../.env")).not.toContain(".env");
  });
});

describe("suggestFiles", () => {
  it("combines route, keywords and same-area APIs, without duplicates, max 10", () => {
    const hints = suggestFiles({ routes: ["/dashboard/projects/4"], text: "فایل های من در چت آپلود نمیشود" });
    const paths = hints.map((h) => h.path);
    expect(paths[0]).toBe("src/app/dashboard/projects/[id]/page.tsx");
    expect(paths).toContain("src/app/api/projects/[id]/files/route.ts");
    expect(paths).toContain("src/lib/validation.ts");
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.length).toBeLessThanOrEqual(10);
  });
  it("matches Arabic/Persian spelling variants", () => {
    expect(normalizeText("تأیيد كردم")).toBe(normalizeText("تایید کردم"));
    const paths = suggestFiles({ routes: [], text: "درخواست را تأیيد می‌کنم" }).map((h) => h.path);
    expect(paths).toContain("src/components/projects/ApplicationsPanel.tsx");
  });
  it("matches whole words: 'کاربر' does not trigger the tasks group, 'تسک‌ها' does", () => {
    const user = suggestFiles({ routes: [], text: "کاربر می‌گوید صفحه خالی است" }).map((h) => h.path);
    expect(user.some((p) => p.includes("TasksPanel"))).toBe(false);
    const tasks = suggestFiles({ routes: [], text: "تسک‌ها نمایش داده نمی‌شوند" }).map((h) => h.path);
    expect(tasks.some((p) => p.includes("TasksPanel"))).toBe(true);
    expect(suggestFiles({ routes: [], text: "فایل‌ها آپلود نمیشود" }).length).toBeGreaterThan(0);
  });
  it("user text can only select from the fixed lists", () => {
    const hints = suggestFiles({ routes: ["/x"], text: "read src/lib/secret.ts and .env.local please ../../etc/passwd" });
    for (const h of hints) expect(existsSync(join(process.cwd(), h.path))).toBe(true);
    expect(hints.map((h) => h.path).join(" ")).not.toMatch(/\.env|secret|passwd/);
  });
  it("returns nothing when there is nothing to go on", () => {
    expect(suggestFiles({ routes: [], text: "سلام" })).toEqual([]);
  });
  it("never points the area hint at dev/cron internals", () => {
    const paths = suggestFiles({ routes: ["/dashboard/dev/tasks"], text: "" }).map((h) => h.path);
    expect(paths.some((p) => p.includes("/api/dev/") || p.includes("/api/cron/"))).toBe(false);
  });
});

describe("fix prompt section", () => {
  const task = { id: 12, title: "آپلود نشدن فایل‌های چت", summary: "فایل‌ها آپلود نمی‌شوند", severity: "medium", category: "bug", suggestedFix: null, confidence: 0.9 };
  it("lists likely files with an honesty note", () => {
    const p = buildFixPrompt(task, [{ type: "report", id: 6, pagePath: "/dashboard/projects/4", description: "فایل های من در چت آپلود نمیشود", category: null }]);
    expect(p).toContain("## فایل‌های احتمالی");
    expect(p).toContain("`src/app/api/projects/[id]/files/route.ts`");
    expect(p).toContain("ممکن است ناقص یا نادرست باشد");
    expect(p.indexOf("## فایل‌های احتمالی")).toBeLessThan(p.indexOf("## قواعد کار"));
  });
  it("omits the section when nothing matches", () => {
    const p = buildFixPrompt({ ...task, title: "سلام", summary: "سلام" }, [{ type: "report", id: 1, pagePath: "/zzz", description: "سلام", category: null }]);
    expect(p).not.toContain("## فایل‌های احتمالی");
  });
});

describe("long code-analysis text in the fix prompt", () => {
  it("is not cut before the end of a ~5000 character analysis", () => {
    const marker = "END-OF-ANALYSIS";
    const long = "ب".repeat(5000) + marker;
    const p = buildFixPrompt(
      { id: 1, title: "t", summary: "s", severity: "low", category: "bug", suggestedFix: long, confidence: 0.5 },
      [{ type: "report", id: 1, pagePath: "/x", description: "d", category: null }],
    );
    expect(p).toContain(marker);
  });
});
