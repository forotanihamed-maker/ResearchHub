// src/lib/ai/code/config.ts
import { validateRepoConfig } from "@/lib/ai/code/githubReader";
import type { Env } from "@/lib/ai/provider";

export interface CodeConfig {
  token: string;
  repo: string;
  branch: string;
}

/** null = code access is not configured (missing token or repo). Throws on malformed repo/branch. */
export function getCodeConfig(env: Env = process.env): CodeConfig | null {
  const token = (env.GITHUB_READ_TOKEN ?? "").trim();
  const repo = (env.GITHUB_REPO ?? "").trim();
  const branch = (env.GITHUB_BRANCH ?? "main").trim() || "main";
  if (!token || !repo) return null;
  validateRepoConfig(repo, branch);
  return { token, repo, branch };
}
