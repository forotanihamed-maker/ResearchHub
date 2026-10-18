# اصلاح مرحله ۱ — فهرست تغییرها

مسیر فایل‌ها در این زیپ همان مسیر داخل پروژه است. روی پروژه کپی کنید، سپس دو فایل را حذف کنید.

## جایگزین یا اضافه می‌شوند
- `migrations/20261017_ai_assistant_phase1_data_model.sql`: جایگزین فایل قبلی (همان نام).
  - یکتایی `ai_task_sources` حالا روی `(source_type, source_id)` است: هر گزارش یا خطا فقط به یک تسک وصل می‌شود.
  - روی `ai_tasks.confidence` یک CHECK بازه‌ی ۰ تا ۱ اضافه شد.
  - همچنان idempotent است (دوبار اجرا بدون خطا).
- `src/db/schema.ts`: همان تغییرها در Drizzle (`check`، یکتای جدید، index روی `task_id`).
  - **اگر بعد از گذاشتن زیپ مرحله‌ی ۱ چیز دیگری در `schema.ts` عوض کرده‌اید**، فایل را جایگزین نکنید و به‌جایش `schema.ts.patch` را اعمال کنید: `git apply schema.ts.patch`، یا دستی طبق فایل patch (۳ جا).
- `vitest.config.mts`: نام جدید فایل تنظیمات Vitest (هشدار CJS رفع می‌شود).
- `scripts/verify-ai-schema.ts` و `scripts/verify-ai-behavior.sql`: نسخه‌ی به‌روز آزمون‌ها.

## حذف کنید
- `vitest.config.ts` (جایش `vitest.config.mts` آمد؛ اگر هر دو بمانند Vitest ممکن است گیج شود).
- `drizzle.config.json`: حاوی آدرس اتصال واقعی با رمز بود. `drizzle.config.ts` کافی است. **حذف فایل رمز را بی‌اثر نمی‌کند؛ باید رمز Neon را عوض کنید** و در Vercel و `.env.local` به‌روز کنید. اگر فایل در Git بوده، رمز در تاریخچه هم هست.

## اگر migration قبلی را جایی اجرا کرده‌اید
(فقط اگر روی هر دیتابیسی، حتی آزمایشی، نسخه‌ی قبلی اجرا شده)
```sql
DROP INDEX IF EXISTS ai_task_sources_task_source_uidx;
DROP INDEX IF EXISTS ai_task_sources_source_idx;
CREATE UNIQUE INDEX IF NOT EXISTS ai_task_sources_source_uidx ON ai_task_sources(source_type, source_id);
CREATE INDEX IF NOT EXISTS ai_task_sources_task_id_idx ON ai_task_sources(task_id);
DO $$ BEGIN
  ALTER TABLE ai_tasks ADD CONSTRAINT ai_tasks_confidence_range
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```
اگر `ai_task_sources` از قبل ردیفی دارد که یک منبع را دوبار نشان می‌دهد، ساخت ایندکس یکتا خطا می‌دهد. جدول‌ها هنوز خالی‌اند، پس معمولاً مشکلی نیست.

## آزمون بعد از جایگذاری
```cmd
npm run typecheck
npm test
npm run lint -- --quiet
npm run build
```
و روی دیتابیس آزمایشی (branch جدا در Neon، نه production):
```cmd
psql "%TEST_DATABASE_URL%" -v ON_ERROR_STOP=1 -f migrations/20261017_ai_assistant_phase1_data_model.sql
psql "%TEST_DATABASE_URL%" -v ON_ERROR_STOP=1 -f migrations/20261017_ai_assistant_phase1_data_model.sql
npx tsx scripts/verify-ai-schema.ts
psql "%TEST_DATABASE_URL%" -f scripts/verify-ai-behavior.sql
```
انتظار:
- هر دو بار اجرای migration بدون خطا.
- `verify-ai-schema` آخرش `SCHEMA == DB for new tables and all enums`.
- `verify-ai-behavior` دقیقاً ۹ خطای ERROR عمدی می‌دهد، از جمله دو مورد `ai_task_sources_source_uidx` (T4 و T4b) و دو مورد `ai_tasks_confidence_range` (T8). هیچ ERROR دیگری نباید باشد.
