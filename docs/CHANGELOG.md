# تاریخچه‌ی تغییرها (دستیار هوش مصنوعی، فضای ذخیره‌ی فایل، مستندات)

هر ردیف فقط می‌گوید چه چیزی افزوده شد. جزئیات فنی در `docs/technical/AI_ASSISTANT.md` و `docs/technical/STORAGE.md` است. تاریخ نسخه: 2026-10-23.

## زیرساخت و مدل داده (پیش از مرحله‌ی ۶)
- **مرحله‌ی ۰:** CI در `.github/workflows/ci.yml`، ESLint، Vitest، و `src/proxy.ts` (کنترل Origin برای CSRF و سقف اندازه‌ی بدنه).
- **مرحله‌ی ۱:** ۸ جدول دستیار (`issue_reports`، `error_events`، `ai_tasks`، `ai_task_sources`، `ai_analysis_runs`، `ai_budget`، `ai_tool_calls`، `ai_pending_actions`) با migration `20261017_ai_assistant_phase1_data_model.sql`. یکتایی `(source_type, source_id)` و CHECK بازه‌ی `confidence`.
- ورودی‌ها (`/api/reports`، `/api/errors`، ثبت خطای سرور) و محافظ دسترسی پنل (`DEV_ADMIN_EMAILS`، پاسخ 404 برای غیرمجاز، `/api/dev/me`).

## مرحله‌ی ۶ — پردازش خودکار
- endpoint `/api/cron/triage` با `CRON_SECRET`، قفل advisory، بودجه‌ی اتمی ماهانه، ماسک، اعتبارسنجی سخت‌گیرانه، تسک `needs_human` در صورت خروجی نامعتبر.
- ارائه‌دهنده‌ها: `fake`، `deepseek`، `openai_compatible` (AvalAI). تنظیمات `AI_TOKEN_PARAM`، `AI_OMIT_TEMPERATURE`، `AI_MAX_OUTPUT_TOKENS`.
- گردش‌کار `triage.yml` (هر ۳۰ دقیقه)، `scripts/ai-budget.mjs`، `scripts/ai-retry-needs-human.mjs`.
- اصلاح‌ها حین بهره‌برداری: قاعده‌ی پرامپت درباره‌ی `needs_human` (ندانستن علت دلیل نیست)، تشخیص `APP_URL` بدون `https://`، پیام‌های تشخیصی `lastProviderStatus` و `lastInvalidReason`، علت داخلی خطای سرور (`cause: ...`).

## مرحله‌ی ۷ و ۷b — پنل و پرامپت رفع
- پنل `/dashboard/dev/tasks`: فهرست و فیلتر، جزئیات، تغییر وضعیت، نوار بودجه، توقف اضطراری. بودجه حتی با تنظیمات نامعتبر نمایش داده می‌شود.
- پرامپت رفع برای Claude (`fixPrompt.ts`) با بلوک‌های داده‌ی نامطمئن.
- دکمه‌ی «گزارش مشکل» در Sidebar؛ ادغام `devPanel` پس از ورود در `AuthContext`.

## مرحله‌ی ۷c — فایل‌های احتمالی
- `fileHints.ts` و `routeManifest.json` (ساخته‌شده با `scripts/gen-route-manifest.mjs`). حدس قطعی بدون هزینه؛ تطبیق بر پایه‌ی کلمه.

## مرحله‌ی ۸ — امنیت
- حذف کاراکترهای نامرئی و جهت‌دار، تک‌خطی‌سازی فیلدهای مسیر و دسته و عنوان (`maskLine`).
- `security.test.ts` و `scripts/ai-injection-eval.mts`. نتیجه‌ی اجرای واقعی روی `gpt-5.6-luna`: ۱۰ از ۱۰.

## مرحله‌ی ۹ — دسترسی به کد و حذف تسک
- هسته‌ی امن: `pathPolicy.ts` و `githubReader.ts`.
- «تحلیل با کد»: حلقه‌ی ابزار (`analyze.ts`)، `provider.chat`، route `analyze-code`، سقف‌های مرحله و هزینه و زمان.
- حذف تسک انجام‌شده (`devTaskDelete.ts`)، همراه با پاک شدن رویداد خطای منبع.
- اصلاح‌ها: باگ بریده شدن متن در `sanitizeSensitiveText` (سقف ۲۰۰۰ نویسه)، تطبیق کلمه‌ای فایل‌های احتمالی، نمایش هزینه به صورت `مدل ×تعداد` و «تخمینی».

## مرحله‌ی ۱۰ — فضای ذخیره‌ی S3 (آماده‌ی انتقال)
- `src/lib/storage.ts` با دو درایور (S3-سازگار و Blob) و بدون تغییر schema؛ وابستگی `@aws-sdk/client-s3`.
- کوتاه‌سازی نام فایل بلند؛ ثبت خطای واقعی آپلود در پنل خطاها.
- راهنمای انتقال `docs/MIGRATION-LIARA.md`.

## مستندات (این نسخه)
- افزوده: `technical/AI_ASSISTANT.md`، `technical/STORAGE.md`، `operations/AI_OPERATIONS.md`، این فایل.
- به‌روز شد: `README-FA.md`، `docs/README.md`، `DOCUMENTATION_MAP.md`، `SOURCE_NOTE.md`، `product/02_CURRENT_STATE.md`، `technical/*`، `operations/*`، بسته‌ی `ResearchHub_AI_Developer_V1/*`، `ai-assistant/*`، و یادداشت وضعیت در `developer-ai/*`.

## تصمیم‌های ثبت‌شده
- بازخورد روی راه‌حل‌ها (جدول `ai_task_feedback`) پیشنهاد شد و **ساخته نشد** (تصمیم مالک، 2026-10-22).
- انتقال به لیارا: داده از Neon منتقل می‌شود، `JWT_SECRET` همان می‌ماند، «تحلیل با کد» می‌ماند، دامنه‌ی `.ir` بعداً. زمان انتقال به تأمین بودجه بسته است.
