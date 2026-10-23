# عملیات دستیار هوش مصنوعی

**مبنا:** کد و تجربه‌ی اجرا تا 2026-10-23. وضعیت راستی‌آزمایی در `docs/technical/AI_ASSISTANT.md` بخش ۱۲ است.

## ۱. متغیرهای محیطی
در `.env.local` (محلی) و در تنظیمات محیط میزبان (Production). هرگز commit نشوند.

| متغیر | معنی | نمونه یا پیش‌فرض |
|---|---|---|
| `AI_ENABLED` | روشن یا خاموش کل پردازش | `true` |
| `AI_PROVIDER` | `fake` / `deepseek` / `openai_compatible` | `fake` |
| `AI_BASE_URL` | آدرس دروازه (اجباری برای `openai_compatible`، فقط https) | `https://api.avalai.ir/v1` |
| `AI_MODEL_TRIAGE` | مدل اولویت‌بندی (اجباری برای `openai_compatible`) | `gpt-5.6-luna` |
| `AI_MODEL_DEEP` | مدل قوی‌تر برای تسک‌های high/critical و برای تحلیل با کد (اختیاری) | — |
| `AI_API_KEY` | کلید دروازه (برای deepseek نام‌های `Deep_Seek_ApiKey` و `DEEPSEEK_API_KEY` هم پذیرفته است) | — |
| `AI_TOKEN_PARAM` | `max_tokens` یا `max_completion_tokens` | `max_completion_tokens` برای مدل‌های جدید OpenAI |
| `AI_OMIT_TEMPERATURE` | ارسال نکردن temperature | `true` برای مدل‌های استدلالی |
| `AI_MAX_OUTPUT_TOKENS` | سقف خروجی هر فراخوانی (۲۰۰ تا ۸۰۰۰) | ۷۰۰؛ برای مدل‌های استدلالی `3000` |
| `AI_TRIAGE_BATCH` | تعداد مورد در هر اجرا (۱ تا ۵۰) | ۲۰ |
| `AI_MONTHLY_CAP_USD` | سقف ماهانه به دلار | ۵ |
| `AI_PRICE_INPUT_USD_PER_M`، `AI_PRICE_OUTPUT_USD_PER_M` | قیمت واقعی مدل برای محاسبه‌ی دقیق‌تر بودجه | جدول داخلی |
| `CRON_SECRET` | راز مشترک cron؛ تصادفی و طولانی | — |
| `DEV_ADMIN_EMAILS` | ایمیل‌های مجاز پنل (با کاما) | — |
| `GITHUB_READ_TOKEN`، `GITHUB_REPO`، `GITHUB_BRANCH` | «تحلیل با کد» (اختیاری) | `GITHUB_BRANCH=main` |

اگر `GITHUB_*` تنظیم نباشد فقط دکمه‌ی «تحلیل با کد» با پیام روشن 503 جواب می‌دهد؛ بقیه‌ی دستیار کار می‌کند.

## ۲. زمان‌بندی (GitHub Actions)
فایل `.github/workflows/triage.yml`: هر ۳۰ دقیقه و به‌صورت دستی (`workflow_dispatch`). دو Secret در GitHub لازم است:
- `APP_URL`: آدرس سایت **با `https://`** و بدون `/` انتهایی (مثلاً `https://research-hub-kohl-psi.vercel.app`).
- `CRON_SECRET`: دقیقاً همان مقدار محیط سرور.
گردش‌کار فقط وقتی موفق است که HTTP 200 و `"ok":true` برگردد؛ خروجی (کد HTTP و ۶۰۰ نویسه‌ی اول) در لاگ چاپ می‌شود. endpoint هم `GET` و هم `POST` را می‌پذیرد، بدون راز `401` می‌دهد و اگر `CRON_SECRET` تنظیم نشده باشد بسته می‌ماند (fail-closed).
گردش‌کار `ci.yml` روی push و pull request: typecheck، lint، test، build (با مقادیر ساختگی برای `DATABASE_URL` و `JWT_SECRET`).

اجرای دستی از خط فرمان:
```
curl -s -H "Authorization: Bearer CRON_SECRET" -X POST https://آدرس/api/cron/triage
```
(در PowerShell از `curl.exe` استفاده کنید؛ `Invoke-RestMethod` بدنه‌ی خطا را پنهان می‌کند.)
خروجی نمونه: `processed`, `created`, `needsHuman`, `failed`, `escalated`, `budgetExhausted`, `costUsd`، و در صورت خطا `lastProviderStatus` و `lastInvalidReason` (فقط نام فیلد، نه محتوا).

## ۳. عیب‌یابی (از تجربه‌ی واقعی)
| علامت | علت محتمل | اقدام |
|---|---|---|
| `{"error":"Unauthorized"}` یا 401 | `CRON_SECRET` در سرور و در درخواست یکی نیست | مقدار را یکسان کنید؛ بعد از تغییر محیط، سرور را ری‌استارت یا دوباره deploy کنید |
| `ECONNREFUSED` محلی | سرور `npm run dev` روشن نیست یا بعد از تغییر `.env.local` ری‌استارت نشده | سرور را روشن کنید |
| Actions سبز ولی چیزی پردازش نشد | `APP_URL` بدون `https://` (curl بدون `-L` ریدایرکت را موفق می‌داند) | `https://` اضافه کنید؛ گردش‌کار فعلی کد HTTP و `ok:true` را چک می‌کند |
| `lastProviderStatus: 402` | موجودی کلید مدل تمام شده | شارژ حساب سرویس‌دهنده |
| `lastProviderStatus: 401/403` | کلید یا آدرس دروازه نادرست | `AI_API_KEY` و `AI_BASE_URL` را بررسی کنید |
| همه‌ی تسک‌ها `needs_human` | مدل خروجی معتبر نداد یا پرامپت بیش از حد محتاط بود | `lastInvalidReason` را ببینید؛ برای مدل‌های استدلالی `AI_MAX_OUTPUT_TOKENS` را بالا ببرید (۳۰۰۰)؛ بعد `node scripts/ai-retry-needs-human.mjs --yes` |
| بودجه در پنل «خوانده نشد» | تنظیمات AI نامعتبر روی سرور | پنل بودجه را همیشه نشان می‌دهد و `configError` را علامت می‌زند؛ متغیرها را بررسی کنید |
| منوی پنل بعد از ورود نیست | `DEV_ADMIN_EMAILS` شامل ایمیل شما نیست | ایمیل دقیق را اضافه کنید |
| «تحلیل با کد» 503 | `GITHUB_*` یا `AI_ENABLED` | متغیرها را کامل کنید |
| «تحلیل با کد» 429 | تحلیل دیگری در ۹۰ ثانیه‌ی اخیر برای همین تسک | صبر کنید |
| «تحلیل با کد» 502 با «زمان تمام شد» | بیش از ۵۰ ثانیه | دوباره امتحان کنید یا پرامپت دستی بسازید |
| آپلود: `Failed to fetch` و `ERR_CONNECTION_CLOSED` | اتصال از مسیر شبکه بریده شد (درخواست به سرور نرسید) | با/بدون VPN و اینترنت دیگر امتحان کنید؛ علت شبکه است نه کد (فرضیه، ثابت‌نشده) |
| آپلود: 500 `Internal server error` | خطا بعد از اعتبارسنجی: ذخیره‌ساز یا دیتابیس | خطای واقعی در پنل دستیار (تسک خطا) یا لاگ میزبان؛ نبودن تنظیم ذخیره‌ساز پیام جداگانه‌ی `File storage is not configured` می‌دهد |

## ۴. بودجه و هزینه
- سقف ماهانه ۵ دلار پیش‌فرض؛ تخمین برنامه چند برابر محافظه‌کارانه است (بخش ۵ مستند فنی).
- هزینه‌ی تقریبی اندازه‌گیری‌شده: پردازش هر گزارش حدود `0.0017$` (۴ گزارش = `0.0068$`)؛ «تحلیل با کد» طبق تخمین برنامه بین `0.06$` و `0.13$` برای هر اجرا. هزینه‌ی واقعی را فقط در پنل ارائه‌دهنده می‌توان دید.

## ۵. بهداشت امنیتی
- `CRON_SECRET` را تصادفی و طولانی بگذارید و اگر در چت یا جای عمومی دیده شد، عوض کنید (هم در میزبان هم در GitHub Secrets).
- کلیدها (`AI_API_KEY`، `GITHUB_READ_TOKEN`، `S3_SECRET_KEY`) فقط در محیط سرور و `.env.local`؛ `.env.local` و `drizzle.config.json` را commit نکنید.
- توکن GitHub تاریخ انقضا دارد (پیشنهاد ۹۰ روز)؛ تاریخش را یادداشت کنید. دسترسی آن فقط Contents: Read-only و فقط همان repo باشد.
- اگر `drizzle.config.json` قبلاً رمز واقعی دیتابیس داشت، حذف فایل کافی نیست؛ رمز دیتابیس را عوض کنید.
- هر تغییر مدل (`AI_MODEL_TRIAGE`) را با `npx tsx scripts/ai-injection-eval.mts` بسنجید.
