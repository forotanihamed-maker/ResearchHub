# معماری
**مبنا:** کد مخزن، 2026-10-23.

## فناوری‌ها
Next.js 16 (App Router)، React 19، TypeScript strict، PostgreSQL + Drizzle ORM 0.45 (`pg`)، Tailwind 4، TanStack React Query، Vitest 5، ESLint. میزبان: Vercel؛ دیتابیس: Neon. رابط فارسی و راست‌به‌چپ.

## ساختار پوشه‌ها
- `src/app/` — صفحات (`dashboard/*`، `auth/*`، `invite/[token]`) و routeهای API.
- `src/components/`، `src/contexts/` — UI و وضعیت کلاینت (از جمله `AuthContext` که پس از ورود پرچم `devPanel` را می‌گیرد).
- `src/db/` — `schema.ts` (۱۹ جدول)، `index.ts` (اتصال)، `seed.ts`.
- `src/lib/` — منطق مشترک: `auth`، `validation`، `permissions`، `projectAccess`، `rateLimit`، `auditLog`، `activityLog`، `storage`، `errorCapture`، `devAccess`، `devTasks`، `devTaskDelete`.
- `src/lib/ai/` — دستیار هوش مصنوعی: `triage`، `provider` و `providers/*`، `mask`، `prompts`، `validate`، `budget`، `fixPrompt`، `fileHints` و `routeManifest.json`، و `code/*` (تحلیل با کد).
- `src/proxy.ts` — محافظ مرکزی همه‌ی `/api/*` (بخش بعد).
- `migrations/`، `drizzle/` — تغییرهای schema (به هشدار `DATABASE.md` درباره‌ی ناقص بودن توجه کنید).
- `scripts/` — ابزارهای خط فرمان (بودجه، بازپردازش، مانیفست route، ارزیابی تزریق پرامپت، اعمال migration).
- `.github/workflows/` — `ci.yml` (typecheck، lint، test، build) و `triage.yml` (زمان‌بندی دستیار، هر ۳۰ دقیقه).

## جریان درخواست
مرورگر ← `src/proxy.ts` (برای متدهای تغییردهنده: تطبیق `Origin`/`Referer` با سایت برای CSRF، سقف بدنه‌ی JSON برابر ۱۰۰KB و multipart برابر ۱۱MB) ← route handler (`getAuthUser()` از کوکی `auth_token`، مجوز، اعتبارسنجی) ← Drizzle ← PostgreSQL.
درخواست بدون `Origin` و `Referer` (curl، سرور به سرور) عبور می‌کند؛ CSRF فقط برای مرورگر معنی دارد.

## جریان‌های مهم دیگر
- **دستیار AI:** `ورودی (/api/reports، /api/errors، ثبت خطای سرور)` ← جدول‌های `issue_reports` و `error_events` ← `/api/cron/triage` ← تسک در `ai_tasks` ← پنل `/dashboard/dev/tasks`. شرح کامل: `AI_ASSISTANT.md`.
- **فایل:** همه‌ی ورود و خروج فایل از `src/lib/storage.ts` (S3 یا Blob)، دانلود با استریم از خود برنامه پس از بررسی عضویت. شرح: `STORAGE.md`.

## محدودیت‌های معماری
- محدودکننده‌های نرخ (`rateLimit.ts`، `reportRateLimit.ts` و سقف آپلود) در حافظه‌ی هر instance هستند؛ روی serverless سراسری نیستند.
- بدنه‌ی درخواست روی Vercel سقف پلتفرم دارد (حدود ۴٫۵MB؛ از مستندات پلتفرم، اجرا نشده).
