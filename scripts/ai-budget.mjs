// Usage: node scripts/ai-budget.mjs            (status)
//        node scripts/ai-budget.mjs --cap 8    (set this month's cap in USD)
//        node scripts/ai-budget.mjs --kill on|off
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

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is not set"); process.exit(1); }

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
const MONTH = "to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM')";
try {
  await client.connect();
  const cap = opt("--cap");
  const kill = opt("--kill");
  if (cap !== undefined) {
    const n = Number(cap);
    if (!Number.isFinite(n) || n <= 0) throw new Error("--cap must be a positive number (USD)");
    await client.query(
      `INSERT INTO ai_budget (month, monthly_cap_usd, used_usd, kill_switch)
       VALUES (${MONTH}, $1::numeric, 0, false)
       ON CONFLICT (month) DO UPDATE SET monthly_cap_usd = EXCLUDED.monthly_cap_usd`, [n.toFixed(6)]);
  }
  if (kill !== undefined) {
    if (kill !== "on" && kill !== "off") throw new Error("--kill must be on or off");
    await client.query(
      `INSERT INTO ai_budget (month, monthly_cap_usd, used_usd, kill_switch)
       VALUES (${MONTH}, 5, 0, $1)
       ON CONFLICT (month) DO UPDATE SET kill_switch = EXCLUDED.kill_switch`, [kill === "on"]);
  }
  const r = await client.query(
    `SELECT month, monthly_cap_usd, used_usd, kill_switch FROM ai_budget WHERE month = ${MONTH}`);
  if (r.rows.length === 0) console.log("No budget row for this month yet (created on first triage run).");
  else {
    const b = r.rows[0];
    console.log(`month=${b.month} cap=$${b.monthly_cap_usd} used=$${b.used_usd} kill_switch=${b.kill_switch}`);
  }
} catch (e) {
  console.error("Error:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
