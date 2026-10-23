# پایگاه داده
**مبنا:** `src/db/schema.ts`، 2026-10-23. فناوری: PostgreSQL (Neon در Production) + Drizzle ORM.

## جدول‌ها (۱۹ جدول در schema)
- **هسته:** `users`، `admin_departments`، `direct_messages`، `projects`، `applications`، `project_members`، `chat_messages`، `project_files`.
- **اجرای پروژه:** `tasks`، `project_milestones`، `project_activity`. Activity برای Task/Milestone به‌صورت Snapshot است و `entityId` آن FK مستقیم نیست.
- **دستیار AI (۸ جدول):** `issue_reports`، `error_events`، `ai_tasks`، `ai_task_sources`، `ai_analysis_runs`، `ai_tool_calls`، `ai_pending_actions`، `ai_budget`. شرح ستون‌ها و قیدها در `AI_ASSISTANT.md` بخش مدل داده.
- `project_files.file_url` یا آدرس Blob است یا مرجع `s3:<key>` (`STORAGE.md`). نظر بالای تعریف جدول در `schema.ts` هنوز می‌گوید بایت‌ها در Blob‌اند؛ آن توضیح قدیمی است.
- قیدهای مهم دستیار: یکتایی `(source_type, source_id)` در `ai_task_sources`، یکتایی `fingerprint` در `error_events`، یکتایی `month` در `ai_budget`، و بازه‌ی مجاز `confidence`.

## ⚠️ هشدار: migrationهای مخزن، دیتابیس کامل نمی‌سازند
با ساختن یک دیتابیس خالی از `drizzle/` و `migrations/` (آزمایش‌شده روی Postgres محلی) فقط **۱۸ جدول** ساخته می‌شود؛ `project_files` در هیچ فایل migration نیست (در Production وجود دارد، به‌احتمال زیاد با `drizzle-kit push` یا اجرای دستی ساخته شده). `drizzle/0000` هم فقط ۵ جدول پایه دارد. نتیجه:
- برای نسخه‌ی کامل دیتابیس، **Neon مرجع است**، نه پوشه‌ی migrations. روش امن انتقال، `pg_dump`/`pg_restore` است (`MIGRATION-LIARA.md`).
- ساخت دیتابیس تازه از migrationها پیش از ساختن یک migration برای `project_files` توصیه نمی‌شود.
- در `migrations/` دو فایل با پیشوند `20261017` هست که هر دو همان ۸ جدول دستیار را می‌سازند (۱۱۳ و ۱۲۹ خط). کدام روی Neon اجرا شده را از خود دیتابیس بررسی کنید (`scripts/verify-ai-schema.ts`).

## ابزارها
- `scripts/apply-migration.mjs` — اعمال یک فایل migration.
- `scripts/verify-ai-schema.ts`، `scripts/verify-ai-behavior.sql` — بررسی جدول‌ها و قیدهای دستیار.
- `scripts/set-admin-departments.{mjs,sql}` — تنظیم دپارتمان ادمین‌ها.

## قاعده‌ی تغییر
Migration باید طراحی، بازبینی، تأیید، اعمال و سپس Verify شود. تغییر مخرب Production بدون تأیید انسانی مجاز نیست. اجرای `drizzle-kit push` روی Production ممنوع است مگر پس از بازبینی صریح.
