// Usage: node scripts/ai-retry-needs-human.mjs          (dry run: only counts)
//        node scripts/ai-retry-needs-human.mjs --yes    (do it)
//
// Deletes AI tasks whose analysis failed (category 'needs_human') and puts the
// reports they came from back to status 'new', so the next triage run retries
// them. Error events are simply forgotten by the link table (cascade) and are
// picked up again too. Touches nothing else.
import pg from "pg";
import { readFileSync, existsSync } from "node:fs";

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvFile(".env.local");
loadEnvFile(".env");

if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is not set"); process.exit(1); }
const apply = process.argv.includes("--yes");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();
  const found = await client.query(`
    SELECT count(*)::int AS tasks,
           count(*) FILTER (WHERE EXISTS (SELECT 1 FROM ai_task_sources s WHERE s.task_id = t.id AND s.source_type = 'report'))::int AS reports
      FROM ai_tasks t WHERE t.category = 'needs_human'`);
  const { tasks, reports } = found.rows[0];
  console.log(`needs_human tasks: ${tasks} (from reports: ${reports})`);
  if (!apply) {
    console.log("Dry run. Re-run with --yes to delete them and re-queue their reports.");
  } else if (tasks === 0) {
    console.log("Nothing to do.");
  } else {
    await client.query("BEGIN");
    const reset = await client.query(`
      UPDATE issue_reports SET status = 'new'
       WHERE status = 'triaged'
         AND id IN (SELECT s.source_id FROM ai_task_sources s
                      JOIN ai_tasks t ON t.id = s.task_id
                     WHERE s.source_type = 'report' AND t.category = 'needs_human')`);
    const del = await client.query("DELETE FROM ai_tasks WHERE category = 'needs_human'");
    await client.query("COMMIT");
    console.log(`Re-queued ${reset.rowCount} report(s); deleted ${del.rowCount} task(s).`);
  }
} catch (e) {
  try { await client.query("ROLLBACK"); } catch {}
  console.error("Error:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
