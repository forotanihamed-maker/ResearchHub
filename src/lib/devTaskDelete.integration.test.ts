// Runs only against a real Postgres: AI_INTEGRATION_DB=postgresql://... npx vitest run
import { afterAll, beforeEach, describe, expect, it } from "vitest";

const URL = process.env.AI_INTEGRATION_DB;
const d = URL ? describe : describe.skip;

d("deleting a finished task on real postgres", () => {
  let db: typeof import("@/db").db;
  let pool: typeof import("@/db").pool;
  let sql: typeof import("drizzle-orm").sql;
  let del: typeof import("@/lib/devTaskDelete").deleteFinishedTask;
  let runTriage: typeof import("@/lib/ai/triage").runTriage;
  let FakeProvider: typeof import("@/lib/ai/providers/fake").FakeProvider;
  const q = async (text: string) => (await db.execute(sql.raw(text))).rows as Array<Record<string, unknown>>;
  const cfg = {
    enabled: true, provider: "fake" as const, triageModel: "fake-triage", deepModel: "fake-deep",
    baseUrl: "https://api.deepseek.com", monthlyCapUsd: 5, batchSize: 20, maxOutputTokens: 700,
  };

  beforeEach(async () => {
    process.env.DATABASE_URL = URL;
    if (!del) {
      ({ sql } = await import("drizzle-orm"));
      ({ db, pool } = await import("@/db"));
      ({ deleteFinishedTask: del } = await import("@/lib/devTaskDelete"));
      ({ runTriage } = await import("@/lib/ai/triage"));
      ({ FakeProvider } = await import("@/lib/ai/providers/fake"));
    }
    await q("TRUNCATE ai_tool_calls, ai_analysis_runs, ai_task_sources, ai_tasks, ai_budget, issue_reports, error_events RESTART IDENTITY CASCADE");
  });
  afterAll(async () => { if (pool) await pool.end(); });

  async function triageOne(kind: "report" | "error") {
    if (kind === "report") await q("INSERT INTO issue_reports (page_path, description) VALUES ('/dashboard', 'مشکل تستی')");
    else await q("INSERT INTO error_events (source, route, message, stack_hash, fingerprint) VALUES ('server','/api/x','boom','h','fp1')");
    await runTriage({ config: cfg, provider: new FakeProvider() });
    return Number((await q("SELECT id FROM ai_tasks ORDER BY id DESC LIMIT 1"))[0].id);
  }

  it("refuses open and in_progress tasks, deletes nothing", async () => {
    const id = await triageOne("report");
    expect(await del(id)).toBe("not_finished");
    await q(`UPDATE ai_tasks SET status='in_progress' WHERE id=${id}`);
    expect(await del(id)).toBe("not_finished");
    expect((await q("SELECT count(*)::int c FROM ai_tasks"))[0].c).toBe(1);
  });

  it("returns not_found for a missing id", async () => {
    expect(await del(999)).toBe("not_found");
  });

  it("report-sourced task: task and link go, report stays and is NOT triaged again", async () => {
    const id = await triageOne("report");
    await q(`UPDATE ai_tasks SET status='resolved' WHERE id=${id}`);
    expect(await del(id)).toBe("deleted");
    expect((await q("SELECT count(*)::int c FROM ai_tasks"))[0].c).toBe(0);
    expect((await q("SELECT count(*)::int c FROM ai_task_sources"))[0].c).toBe(0);
    expect((await q("SELECT count(*)::int c FROM issue_reports"))[0].c).toBe(1);
    const s = await runTriage({ config: cfg, provider: new FakeProvider() });
    expect(s.created).toBe(0);
    expect((await q("SELECT count(*)::int c FROM ai_tasks"))[0].c).toBe(0);
  });

  it("error-sourced task: the error event goes too, so it is NOT triaged again", async () => {
    const id = await triageOne("error");
    await q(`UPDATE ai_tasks SET status='dismissed' WHERE id=${id}`);
    expect(await del(id)).toBe("deleted");
    expect((await q("SELECT count(*)::int c FROM error_events"))[0].c).toBe(0);
    const s = await runTriage({ config: cfg, provider: new FakeProvider() });
    expect(s.created).toBe(0);
  });

  it("keeps the cost history (analysis runs) with task_id set to null", async () => {
    const id = await triageOne("report");
    const before = (await q("SELECT count(*)::int c FROM ai_analysis_runs"))[0].c as number;
    await q(`UPDATE ai_tasks SET status='resolved' WHERE id=${id}`);
    await del(id);
    expect((await q("SELECT count(*)::int c FROM ai_analysis_runs"))[0].c).toBe(before);
    expect((await q(`SELECT count(*)::int c FROM ai_analysis_runs WHERE task_id IS NOT NULL`))[0].c).toBe(0);
  });
});
