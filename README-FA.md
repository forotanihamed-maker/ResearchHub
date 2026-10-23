# ResearchHub

پلتفرم مدیریت و همکاری پروژه‌های دانشگاهی (دانشگاه علم و صنعت ایران) با سه نقش `student`، `professor` و `admin`، فضای اجرای پروژه (تسک، نقطه‌عطف، فعالیت)، گفتگو و فایل پروژه، و یک **دستیار هوش مصنوعی توسعه‌دهنده** که فقط برای مالک است. وضعیت: MVP / پایلوت.

**مبنای این سند:** کد مخزن در 2026-10-23. اگر سندی با کد اختلاف داشت، کد درست است و سند باید اصلاح شود.

## فناوری
Next.js 16 (App Router، `src/proxy.ts`)، React 19، TypeScript strict، Drizzle ORM، PostgreSQL (Neon در Production)، Vitest، ESLint، Tailwind 4، TanStack React Query، JWT در کوکی httpOnly با `bcryptjs`. فایل‌ها: S3-سازگار یا Vercel Blob. میزبان فعلی: Vercel.

## اجرای محلی
```
npm install
cp .env.example .env.local      # DATABASE_URL و JWT_SECRET را پر کنید
npm run dev
```
اسکریپت‌ها: `dev`، `build`، `start`، `lint`، `typecheck`، `test` (= `vitest run`). تست‌های یکپارچه به یک Postgres محلی نیاز دارند (`TEST_DATABASE_URL`)؛ بدون آن نمی‌توانند اجرا شوند. قبل از تحویل هر تغییر: `npm run typecheck && npm run lint && npm test && npm run build`.

## متغیرهای محیطی (فهرست کامل با توضیح در `.env.example`)
- هسته: `DATABASE_URL`، `JWT_SECRET`، `JWT_EXPIRES_IN`، `SEED_SECRET` (اختیاری)، `LOGIN_MAX_FAILED_ATTEMPTS_PER_IP` (اختیاری).
- دستیار AI: `AI_*`، `CRON_SECRET`، `DEV_ADMIN_EMAILS`، `GITHUB_*` ← `docs/operations/AI_OPERATIONS.md`.
- فایل: `S3_*` یا `BLOB_READ_WRITE_TOKEN` ← `docs/technical/STORAGE.md`.

## دستیار AI (خلاصه)
گزارش کاربران و خطاهای سرور/مرورگر ← هر ۳۰ دقیقه GitHub Actions ← مدل (پس از ماسک داده‌ی حساس) ← تسک اولویت‌بندی‌شده در `/dashboard/dev/tasks` (فقط ایمیل‌های `DEV_ADMIN_EMAILS`؛ بقیه 404). پنل پرامپت رفع برای Claude می‌سازد و «تحلیل با کد» کد را از GitHub (فقط‌خواندنی) می‌خواند. جزئیات: `docs/technical/AI_ASSISTANT.md`.

## مستندات
نقطه‌ی شروع: `docs/README.md` و `docs/DOCUMENTATION_MAP.md`. تاریخچه‌ی تغییرها: `docs/CHANGELOG.md`. انتقال به سرور ایرانی (در انتظار بودجه): `docs/MIGRATION-LIARA.md`.

## هشدارها
- **دیتابیس خالی را فقط با migrationهای مخزن نسازید:** جدول `project_files` در هیچ migration نیست (بخش Database در `docs/technical/DATABASE.md`).
- هر دو فایل `migrations/20261017_ai_assistant_phase1_data_model.sql` و `20261017_ai_service_assistant_phase1.sql` در مخزن هستند؛ هر دو همان ۸ جدول دستیار را تعریف می‌کنند ولی متنشان یکسان نیست (۱۱۳ و ۱۲۹ خط). قبل از اجرای هرکدام یا حذف یکی، با هم مقایسه کنید.
- هیچ migration یا `drizzle-kit push` را بدون بازبینی و تأیید روی Production اجرا نکنید.
