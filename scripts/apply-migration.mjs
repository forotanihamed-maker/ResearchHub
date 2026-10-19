import fs from "node:fs";
import path from "node:path";
import pg from "pg";

function getArg(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

function getDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const line = fs
      .readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .find((item) => item.trim().startsWith("DATABASE_URL="));
    if (!line) return undefined;
    return line.slice(line.indexOf("=") + 1).trim().replace(/^['"]|['"]$/g, "");
  } catch {
    return undefined;
  }
}

const file = getArg("file");
const yes = process.argv.includes("--yes");
const migrationsRoot = path.resolve("migrations");

if (!file) {
  console.error("استفاده: node scripts/apply-migration.mjs --file migrations/<file>.sql [--yes]");
  process.exit(1);
}

const migrationPath = path.resolve(file);
if (!migrationPath.startsWith(`${migrationsRoot}${path.sep}`) || path.extname(migrationPath) !== ".sql") {
  console.error("فقط فایل‌های SQL داخل پوشه migrations مجاز هستند.");
  process.exit(1);
}
if (!fs.existsSync(migrationPath)) {
  console.error("فایل migration پیدا نشد.");
  process.exit(1);
}

const databaseUrl = getDatabaseUrl();
if (!databaseUrl) {
  console.error("DATABASE_URL تنظیم نشده است.");
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(databaseUrl);
} catch {
  console.error("DATABASE_URL معتبر نیست.");
  process.exit(1);
}

const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, "")) || "unknown";
const host = parsed.hostname || "unknown";
console.log(`مقصد migration: ${host}/${databaseName}`);
console.log(`فایل: ${path.relative(process.cwd(), migrationPath)}`);

if (!yes) {
  process.stdout.write('برای ادامه دقیقاً YES را وارد کنید: ');
  const answer = await new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data.trim()));
  });
  if (answer !== "YES") {
    console.log("لغو شد.");
    process.exit(0);
  }
}

const client = new pg.Client({ connectionString: databaseUrl });
try {
  await client.connect();
  await client.query("BEGIN");
  await client.query(fs.readFileSync(migrationPath, "utf8"));
  await client.query("COMMIT");
  console.log("migration با موفقیت اجرا شد.");
} catch (error) {
  try { await client.query("ROLLBACK"); } catch {}
  console.error("migration شکست خورد؛ rollback انجام شد.");
  console.error(error instanceof Error ? error.message : "خطای نامشخص");
  process.exitCode = 1;
} finally {
  await client.end();
}
