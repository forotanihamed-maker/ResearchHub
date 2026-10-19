// تعیین گروه‌های آموزشی یک ادمین (فقط مالک سامانه) — نسخه‌ی Node، بدون نیاز به psql.
//
// روش استفاده (از ریشه‌ی پروژه):
//   node scripts/set-admin-departments.mjs --email x@y.z --depts "هوش مصنوعی,علوم داده"
//
// DATABASE_URL از متغیر محیطی یا از فایل .env.local خوانده می‌شود.
// رفتار مثل set-admin-departments.sql: یک transaction؛ ایمیل ناموجود، کاربر
// غیرادمین، گروه نامعتبر یا فهرست خالی ← خطا و هیچ تغییری ذخیره نمی‌شود.
// گروه‌های قبلی همان ادمین جایگزین می‌شوند؛ اجرای دوباره همان نتیجه را می‌دهد.
// هشدار: فقط مالک سامانه. ابتدا روی دیتابیس آزمایشی.

import fs from "node:fs";
import pg from "pg";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const line = fs
      .readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith("DATABASE_URL="));
    if (line) return line.slice("DATABASE_URL=".length).trim().replace(/^["']|["']$/g, "");
  } catch {}
  return undefined;
}

const email = (arg("email") ?? "").trim().toLowerCase();
const depts = [
  ...new Set((arg("depts") ?? "").split(",").map((d) => d.trim()).filter(Boolean)),
];
const url = databaseUrl();

if (!email || depts.length === 0 || !url) {
  console.error('استفاده: node scripts/set-admin-departments.mjs --email x@y.z --depts "هوش مصنوعی,علوم داده"');
  console.error("و DATABASE_URL باید تنظیم باشد.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
try {
  await client.connect();
  await client.query("BEGIN");
  const u = await client.query(
    "SELECT id FROM users WHERE lower(email) = $1 AND role = 'admin'",
    [email]
  );
  if (u.rowCount === 0) throw new Error(`ادمینی با ایمیل ${email} پیدا نشد`);
  const id = u.rows[0].id;
  // مقدار نامعتبر در cast به enum خطا می‌دهد
  await client.query("DELETE FROM admin_departments WHERE admin_id = $1", [id]);
  await client.query(
    "INSERT INTO admin_departments (admin_id, department) SELECT $1, d FROM unnest($2::department[]) AS d",
    [id, depts]
  );
  const r = await client.query(
    "SELECT department FROM admin_departments WHERE admin_id = $1 ORDER BY department",
    [id]
  );
  await client.query("COMMIT");
  console.log(`انجام شد. گروه‌های ${email}:`);
  for (const row of r.rows) console.log(" -", row.department);
} catch (e) {
  try { await client.query("ROLLBACK"); } catch {}
  console.error("خطا (هیچ تغییری ذخیره نشد):", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
