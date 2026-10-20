# مرحله ۶ — پردازشگر هوش مصنوعی (DeepSeek)

## چه ساخته شد
- `src/lib/ai/provider.ts`: تنظیمات و انتخاب provider. پیش‌فرض `fake` (رایگان). اگر `AI_PROVIDER=deepseek` و کلید نباشد، خطای روشن می‌دهد و **هرگز** بی‌صدا به fake برنمی‌گردد. کلید از `Deep_Seek_ApiKey` خوانده می‌شود (جایگزین‌ها: `DEEPSEEK_API_KEY`، `AI_API_KEY`).
- `providers/deepseek.ts`: فراخوانی `POST https://api.deepseek.com/chat/completions` با `thinking: disabled` و `tool_choice` اجباری روی `submit_triage`، timeout ۳۰ ثانیه، یک تلاش مجدد فقط برای خطای شبکه/۴۲۹/۵xx. کلید فقط در هدر Authorization است؛ در هیچ خطا/لاگی نیست.
- `providers/fake.ts`: خروجی ثابت برای تست.
- `mask.ts`: ماسک ایمیل، توکن، تلفن (با ارقام فارسی)، مسیر فایل، IP، اعداد بلند، query در URL، و خنثی‌سازی `<`/`>`.
- `prompts.ts`: پرامپت سیستمی ثابت فارسی؛ متن کاربر فقط داخل `<user_report>`/`<error_event>`؛ فقط شناسه‌هایی مثل `report#12` (نه نام/ایمیل/شناسه‌ی کاربر).
- `validate.ts`: اعتبارسنجی سخت خروجی مدل (بدون تبدیل)، ماسک و محدودیت طول دوباره.
- `budget.ts`: سقف ماهانه (ماه UTC)، رزرو اتمی در SQL، تسویه پس از فراخوانی، بازگشت هزینه در خطا، kill switch. هزینه با بالاترین نرخ (cache-miss، ساعت اوج) تخمین زده می‌شود.
- `triage.ts`: انتخاب گزارش‌های `new` و خطاهای ۷ روز اخیر که هنوز تسک نشده‌اند، حداکثر ۲۰ مورد و ۴۰ ثانیه در هر اجرا؛ قفل advisory برای جلوگیری از دو اجرای هم‌زمان؛ ساخت تسک + لینک منبع + `triaged` شدن گزارش در یک تراکنش؛ خروجی نامعتبر → یک تلاش مجدد → تسک `needs_human`؛ ارتقا به مدل pro فقط برای high/critical؛ همه‌ی tool callها در `ai_tool_calls` ثبت می‌شوند و غیر از `submit_triage` رد می‌شوند.
- `src/app/api/cron/triage/route.ts`: GET/POST، بدون `CRON_SECRET` همه‌چیز ۴۰۱، فقط `Authorization: Bearer`، مقایسه‌ی timing-safe، پاسخ فقط شمارنده و هزینه.
- `.github/workflows/triage.yml`: هر ۳۰ دقیقه + اجرای دستی.
- `scripts/ai-budget.mjs`: `node scripts/ai-budget.mjs` (وضعیت)، `--cap 8`، `--kill on|off`.
- `.env.example` و دو رویداد جدید در `auditLog.ts`. تغییر schema دیتابیس: **ندارد**.

## نتیجه‌ی بررسی‌ها
- typecheck: بدون خطا — lint: ۰ خطا (فقط هشدارهای قدیمی)
- تست: ۹۲ موفق (۶۱ قبلی + ۳۱ جدید). ۱۱ تست یکپارچه به‌صورت پیش‌فرض رد می‌شوند.
- ۱۱ تست یکپارچه روی Postgres واقعی (با provider جعلی) با `TZ=UTC` و `TZ=Asia/Tehran` هر دو سبز: idempotency، دو اجرای هم‌زمان بدون تکرار، خروجی نامعتبر، tool غیرمجاز، تزریق پرامپت، سقف بودجه، kill switch، خطای provider، ارتقا به مدل pro.
- build با cron route موفق؛ تست سرتاسری: بدون توکن/توکن غلط/توکن در query همگی ۴۰۱، با توکن درست تسک ساخته شد و اجرای دوم هیچ تکراری نساخت؛ توکن در لاگ نیست.
  (محدودیت محیط: build من فونت Google را نمی‌تواند بگیرد؛ برای تست موقتاً فونت را حذف کردم و بعد برگرداندم. روی Vercel مشکلی نیست.)

## تست **نشده**
- **فراخوانی واقعی DeepSeek**: در محیط من کلید و شبکه نبود. فرمت درخواست/پاسخ از مستندات رسمی گرفته شده و با mock تست شده، اما اولین اجرای واقعی را باید شما ببینید. اگر خطای ۴۰۰ درباره‌ی `thinking` یا نام مدل آمد، `AI_MODEL_TRIAGE=deepseek-v4-flash` را امتحان کنید.
- دسترسی/پرداخت DeepSeek از ایران و ارسال متن گزارش‌ها (پس از ماسک) به سرور چینی، تصمیم شماست.

## راه‌اندازی
1. در `.env.local` و Vercel: `AI_PROVIDER=deepseek`، `Deep_Seek_ApiKey=...`، `CRON_SECRET=<رشته‌ی تصادفی بلند>`، و در صورت نیاز `AI_MONTHLY_CAP_USD`.
2. در GitHub → Settings → Secrets: `APP_URL` (مثلاً `https://your-app.vercel.app`) و `CRON_SECRET` (همان مقدار).
3. اول با `AI_PROVIDER=fake` یک بار از Actions → AI triage → Run workflow اجرا کنید، بعد به deepseek بروید.
4. وضعیت بودجه: `node scripts/ai-budget.mjs`؛ توقف اضطراری: `node scripts/ai-budget.mjs --kill on`.
