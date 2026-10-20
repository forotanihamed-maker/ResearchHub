import "dotenv/config";
import { Client } from "pg";

const args = process.argv.slice(2);
const capIndex = args.indexOf("--cap");
const killIndex = args.indexOf("--kill");
const cap = capIndex >= 0 ? Number(args[capIndex + 1]) : null;
const kill = killIndex >= 0 ? args[killIndex + 1] : null;

if (cap !== null && (!Number.isFinite(cap) || cap < 0)) throw new Error("--cap must be a non-negative number");
if (kill !== null && kill !== "on" && kill !== "off") throw new Error("--kill must be on or off");

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const client = new Client({ connectionString: url });
await client.connect();
try {
  const month = (await client.query("SELECT to_char(current_timestamp AT TIME ZONE 'UTC', 'YYYY-MM') AS month")).rows[0].month;
  await client.query("INSERT INTO ai_budget (month, monthly_cap_usd, used_usd, kill_switch) VALUES ($1, $2, 0, false) ON CONFLICT (month) DO NOTHING", [month, process.env.AI_MONTHLY_CAP_USD ?? "5"]);
  if (cap !== null) await client.query("UPDATE ai_budget SET monthly_cap_usd = $1 WHERE month = $2", [cap.toFixed(6), month]);
  if (kill !== null) await client.query("UPDATE ai_budget SET kill_switch = $1 WHERE month = $2", [kill === "on", month]);
  const row = (await client.query("SELECT month, monthly_cap_usd, used_usd, kill_switch FROM ai_budget WHERE month = $1", [month])).rows[0];
  console.log(JSON.stringify(row));
} finally {
  await client.end();
}
