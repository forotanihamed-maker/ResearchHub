# راهنمای آزمون مرحله ۰ و ۱ — نتیجه‌ی اجرا و آزمون‌هایی که خودتان اجرا کنید

پایه‌ی آزمون من: نسخه‌ی اصلی پروژه + شش فایل اصلاح‌شده‌ی قبلی + فایل‌های سه ZIP شما. Node 22، Postgres 16 محلی. روی Neon یا دیتابیس واقعی چیزی اجرا نشد.

## الف) نتیجه‌ی اجرای من

| آزمون | نتیجه |
|---|---|
| `npm run typecheck` | سبز |
| `npm test` (Vitest 5.0.5) | ۹ از ۹ سبز |
| `npm run build` | سبز؛ `ƒ Proxy (Middleware)` شناخته شد و هشدار deprecation نیامد |
| `npm run lint` | **۵ خطا (قرمز)** + ۳۱ هشدار |
| اجرای migration روی کپی دیتابیس فعلی، دو بار پشت‌سرهم | بدون خطا؛ ۱۱ جدول قبلی ← ۱۸ جدول |
| ۱۱ جدول قبلی بعد از migration | schema دقیقاً یکسان |
| مقایسه‌ی `schema.ts` با دیتابیس (ستون، نوع، nullable، طول، index، کلید خارجی و رفتار حذف، همه‌ی enumها) | کاملاً یکسان |
| رفتار کلیدها: ردشدن enum نامعتبر و NOT NULL، یکتایی fingerprint و month، cascade و set null، حذف کاربر | همه طبق طراحی |
| proxy: Origin مخرب / بدون Origin / بدنه‌ی ۱۱۰KB | ۴۰۳ / عبور (۴۰۱ از خود login) / ۴۱۳ |
| `drizzle-kit check --config=drizzle.check.config.ts` | سبز |

## ب) مشکلات پیدا شده (به ترتیب اهمیت)

1. **رمز واقعی Neon داخل `drizzle.config.json`** (متن ساده، شامل آدرس اتصال کامل). این مشکل جدید نیست، اما در ZIPهای این گفتگو هم هست. رمز را در Neon عوض کنید (rotate)، فایل را از پروژه و در صورت وجود از تاریخچه‌ی Git پاک کنید. README مرحله‌ی ۱ می‌گوید این فایل را حذف نکنید؛ من موافق نیستم، چون `drizzle.config.ts` به‌تنهایی کافی است و فایل json فقط رمز را حمل می‌کند.
2. **CI در حالت فعلی قرمز می‌شود.**
   - `npm run lint` پنج خطا دارد: `projects/[id]/page.tsx` خط ۷۱۹، `ApplicationsPanel.tsx` خط ۱۵۱ (گیومه‌ی escape‌نشده) و `SidebarContext.tsx` خط ۳۲ (`setState` داخل effect). این‌ها همان «۵ خطای باقی‌مانده»ی پرامپت قبلی‌اند که هنوز رفع نشده‌اند.
   - `package-lock.json` به‌روز نشده. با lock فعلی، `npm ci` خطا می‌دهد (`Missing: vitest@5.0.5`). یک بار `npm install` بزنید و lock را commit کنید.
3. **idempotency ضعیف در `ai_task_sources`.** کلید یکتا روی `(task_id, source_type, source_id)` است. یک گزارش می‌تواند به دو تسک وصل شود (آزمون T4b). برای تضمین «هر منبع فقط یک بار تسک شود» باید یکتا روی `(source_type, source_id)` باشد. تا migration روی دیتابیس واقعی اجرا نشده، تغییرش رایگان است.
4. موارد کوچک‌تر:
   - `confidence` بازه‌ی ۰ تا ۱ ندارد (مقدار ۷٫۵ پذیرفته شد). یا CHECK اضافه شود یا در مرحله‌ی ۴ با zod محدود شود.
   - `vitest.config.ts` هشدار CJS می‌دهد. نامش را `vitest.config.mts` بگذارید.
   - مرجع `package.json.step0-reference.json` با `package.json` اصلاح‌شده فرق دارد (vitest نسخه‌ی ۳ در برابر ۵؛ lint روی `src` در برابر `.`). نسخه‌ی ۵ با Node نسخه‌ی ۲۲٫۱۲ یا بالاتر لازم است. `node -v` را بررسی کنید.
   - `drizzle-kit check` فقط پوشه‌ی `drizzle/` را می‌سنجد (snapshot قدیمی)، نه `migrations/`. برای مرحله‌ی ۱ ارزش کمی دارد. خطای «AWS Data API» را روی `drizzle-kit check` با تنظیمات پیش‌فرض بازتولید کردم؛ با config بدون اعتبارنامه رفع می‌شود.

## ج) آزمون‌هایی که شما اجرا کنید (CMD، از ریشه‌ی پروژه)

۱. آزمون‌های کد (روی نسخه‌ی خودتان، نه فقط نسخه‌ی من):
```cmd
npm install
npm run typecheck
npm run lint -- --quiet
npm test
npm run build
```
انتظار: چهار مورد اول سبز. فعلاً `lint` قرمز است (بند ب-۲).

۲. آزمون migration روی دیتابیس آزمایشی. **اول در Neon یک branch جدا بسازید** و فقط روی آن اجرا کنید، نه production:
```cmd
psql "%TEST_DATABASE_URL%" -v ON_ERROR_STOP=1 -f migrations/20261017_ai_assistant_phase1_data_model.sql
psql "%TEST_DATABASE_URL%" -v ON_ERROR_STOP=1 -f migrations/20261017_ai_assistant_phase1_data_model.sql
```
انتظار: هر دو بار بدون خطا. اجرای دوم باید فقط NOTICE بدهد.

۳. تطبیق schema با دیتابیس (فایل در همین بسته: `scripts/verify-ai-schema.ts`):
```cmd
set TEST_DATABASE_URL=postgresql://...آدرس branch آزمایشی...
npx tsx scripts/verify-ai-schema.ts
```
انتظار: آخرین خط `SCHEMA == DB for new tables and all enums`.

۴. آزمون رفتار کلیدها (فایل: `scripts/verify-ai-behavior.sql`، داخل ROLLBACK):
```cmd
psql "%TEST_DATABASE_URL%" -f scripts/verify-ai-behavior.sql
```
انتظار: شش خطای ERROR عمدی (enum نامعتبر، NOT NULL دوبار، دو مورد یکتایی، یکتایی month و...). نکته‌ی مهم: بخش T4b باید در طراحی بهتر **خطا بدهد** و در نسخه‌ی فعلی ندهد (بند ب-۳).

۵. آزمون دستی روی برنامه (بدون تغییر رفتار کاربر):
- ورود با دانشجو، استاد، ادمین و باز کردن پروژه‌ها، پیام‌ها، تسک‌ها. هیچ‌چیز نباید تغییر کرده باشد، چون هیچ کدی به جدول‌های جدید وصل نیست.
- `/api/seed?action=force` را **فقط روی دیتابیس آزمایشی** بزنید و ببینید خطای FK نمی‌دهد.

۶. یک آزمون «اشتباه‌گیر» برای CI: یک خطای عمدی TypeScript در یک فایل بنویسید، push کنید و ببینید CI قرمز می‌شود؛ بعد برش گردانید. هدف این است که مطمئن شوید CI واقعاً جلوی خطا را می‌گیرد.

## د) به‌روزرسانی امنیتی Next.js (بعد از بررسی `npm audit --omit=dev`)

هر سه یافته‌ی production از خود Next.js هستند (postcss و sharp داخل next آمده‌اند). نسخه‌ی اصلاح‌شده 16.4.2 است. روی نسخه‌ی من این ارتقا پاس شد: typecheck، ۹ تست، build، آزمون‌های proxy (۴۰۳ و ۴۱۳ و ۴۰۱) و `npm audit --omit=dev` ← ۰ آسیب‌پذیری. دستور (CMD):

```cmd
npm install --save-exact next@16.4.2 eslint-config-next@16.4.2
npm run typecheck
npm test
npm run build
npm audit --omit=dev
```

سپس `package.json` و `package-lock.json` را با هم commit کنید.

نکته‌ی lint: اسکریپت `scripts/verify-ai-schema.ts` بالای فایل `eslint-disable` دارد. اگر آن را در پروژه می‌گذارید و `npm run lint` را اجرا می‌کنید، خطای جدید اضافه نمی‌شود.
