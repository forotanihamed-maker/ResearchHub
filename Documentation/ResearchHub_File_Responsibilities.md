# ResearchHub — خلاصه مسئولیت فایل‌ها (نسخهٔ به‌روزشده و تأییدشده)

> بر خلاف نسخهٔ قبلی، این سند بر اساس **خواندن مستقیم محتوای هر فایل** نوشته شده، نه فقط حدس از روی نام و مسیر. جایی که در طول بررسی یک نکتهٔ فنی مهم یا یک باگ کشف و رفع شده، اشاره شده.

## 1. فایل‌های ریشه پروژه

| فایل                                | مسئولیت واقعی                                                                                        |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `PILOT_SETUP.md`                    | راهنمای راه‌اندازی نسخهٔ Pilot؛ شامل جدول ایمیل/رمز حساب‌های دمو (اخیراً با دیتابیس واقعی هماهنگ شد) |
| `README.md`                         | معرفی کلی پروژه، استک فنی و لینک به مستندات دیگر                                                     |
| `ResearchHub_Pilot_Roadmap_v1.0.md` | نقشهٔ راه فیچرهای نسخهٔ Pilot                                                                        |
| `SECURITY.md`                       | نکات و سیاست‌های امنیتی پروژه                                                                        |
| `drizzle.config.json`               | تنظیمات Drizzle به فرمت JSON — **تکراری** با نسخهٔ `.ts`، پیشنهاد حذف                                |
| `drizzle.config.ts`                 | تنظیمات اصلی Drizzle ORM برای اتصال migration به دیتابیس Postgres                                    |
| `next-env.d.ts`                     | تعریف خودکار تایپ‌های Next.js (فایل تولیدی، دستی ادیت نمی‌شود)                                       |
| `next.config.ts`                    | تنظیمات Next.js؛ بدون rewrite/redirect سفارشی برای مسیرهای admin                                     |
| `package.json`                      | وابستگی‌ها و اسکریپت‌ها (Next 16، React 19، Drizzle، bcryptjs، jsonwebtoken، React Query)            |
| `package-lock.json`                 | قفل نسخهٔ دقیق وابستگی‌های npm                                                                       |
| `postcss.config.mjs`                | تنظیمات PostCSS برای Tailwind 4                                                                      |
| `tsconfig.json`                     | تنظیمات کامپایلر TypeScript                                                                          |
| `tsconfig.tsbuildinfo`              | فایل کش build تایپ‌اسکریپت — نباید در Git commit شود                                                 |
| `vercel.json`                       | تنظیمات دیپلوی روی Vercel                                                                            |

## 2. Database Migrations 🆕

| فایل                                           | مسئولیت واقعی                                                                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/drizzle/0000_nervous_malcolm_colcord.sql` | migration اولیه: تمام جداول پایه (`users`, `projects`, `applications`, `project_members`, `chat_messages`) و enum دپارتمان‌ها    |
| `src/migrations/20260818_admin_panel.sql`      | migration فیچر پنل ادمین: می‌سازد `admin_departments` (تخصیص دپارتمان به هر ادمین) و `direct_messages` (پیام مستقیم ادمین↔استاد) |

## 3. Middleware

| فایل                | مسئولیت واقعی                                                                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/middleware.ts` | با `matcher: "/api/:path*"` **فقط روی درخواست‌های API** اجرا می‌شود؛ روی رندر صفحات (مثل `/admin` یا `/dashboard`) هیچ اثری ندارد — حفاظت از صفحات در خود `page.tsx`ها با `getAuthUser()` انجام می‌شود |

## 4. API Routes

| فایل                                                      | مسئولیت واقعی                                                                                                                                         |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/auth/login/route.ts`                         | بررسی rate-limit، جست‌وجوی ایمیل، مقایسهٔ bcrypt، بلاک‌کردن استادهای `pending`، صدور کوکی JWT                                                         |
| `src/app/api/auth/logout/route.ts`                        | صرفاً کوکی `auth_token` را با تاریخ گذشته خالی می‌کند                                                                                                 |
| `src/app/api/auth/me/route.ts`                            | برگرداندن پروفایل کاربر لاگین‌شده از روی کوکی؛ همچنین (با متد PATCH در فایل کامل) ویرایش پروفایل                                                      |
| `src/app/api/auth/register/route.ts`                      | ثبت‌نام؛ اساتید با وضعیت `pending` ساخته می‌شوند و باید توسط ادمین تأیید شوند، دانشجوها بلافاصله `approved`                                           |
| `src/app/api/applications/route.ts`                       | فقط برای دانشجو: لیست تمام درخواست‌های عضویتی که خودش فرستاده، به‌همراه اطلاعات پروژه و استاد                                                         |
| `src/app/api/dashboard/stats/route.ts`                    | آمار داشبورد شخصی؛ برای استاد (تعداد پروژه‌ها به تفکیک وضعیت) و برای دانشجو (تعداد درخواست‌ها) جداگانه محاسبه می‌شود                                  |
| `src/app/api/health/route.ts`                             | یک `select 1` ساده روی دیتابیس برای health-check                                                                                                      |
| `src/app/api/projects/route.ts`                           | GET: لیست پروژه‌ها (استاد فقط پروژه‌های خودش، دانشجو کاتالوگ باز، ادمین صراحتاً ۴۰۳ می‌گیرد)؛ POST: ساخت پروژهٔ جدید توسط استاد                       |
| `src/app/api/projects/[id]/route.ts`                      | GET جزئیات یک پروژه، PATCH ویرایش (فقط توسط استاد مالک)، با اعتبارسنجی کامل عنوان/توضیحات/ظرفیت/ددلاین                                                |
| `src/app/api/projects/[id]/applications/route.ts`         | GET: لیست درخواست‌های عضویت یک پروژه (فقط استاد مالک می‌بیند)؛ POST: ثبت درخواست عضویت توسط دانشجو                                                    |
| `src/app/api/projects/[id]/applications/[appId]/route.ts` | PATCH: تأیید/رد یک درخواست مشخص توسط استاد، با ثبت در `auditLog`                                                                                      |
| `src/app/api/projects/[id]/messages/route.ts`             | چت گروهی پروژه؛ محدود به اعضای پروژه، با rate-limit جداگانه (۲۰ پیام در دقیقه)                                                                        |
| `src/app/api/seed/route.ts`                               | ساخت داده‌ی نمونه پشت `SEED_SECRET`؛ اکشن‌های `clear`/`force`/`list`/`check-schema` (دو مورد آخر تشخیصی و فقط-خواندنی، در جلسهٔ رفع‌اشکال اضافه شدند) |

### 🆕 API پنل ادمین

| فایل                                     | مسئولیت واقعی                                                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/api/admin/stats/route.ts`       | آمار دانشجو/استاد **محدود به دپارتمان‌های تخصیص‌یافته به همان ادمین**؛ تعداد پروژه‌ها عمداً سراسری (بدون محدودیت دپارتمان) است |
| `src/app/api/admin/departments/route.ts` | GET/PATCH لیست دپارتمان‌های تحت مدیریت یک ادمین خاص (جدول `admin_departments`)                                                 |
| `src/app/api/admin/professors/route.ts`  | لیست اساتید در محدودهٔ دپارتمانی ادمین + تأیید/رد ثبت‌نام استاد (`professorStatus`)                                            |
| `src/app/api/admin/projects/route.ts`    | لیست تمام پروژه‌های دانشگاه برای نظارت ادمین (سراسری، بدون فیلتر دپارتمان)                                                     |
| `src/app/api/admin/messages/route.ts`    | پیام‌رسانی مستقیم دوطرفه بین ادمین و اساتید هم‌دپارتمان (جدول `direct_messages`)                                               |

## 5. صفحات `src/app`

| فایل                                         | مسئولیت واقعی                                                                                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/layout.tsx`                         | Layout ریشه؛ فونت Inter + `QueryProvider` + `AuthProvider`                                                                       |
| `src/app/page.tsx`                           | صفحهٔ اصلی/لندینگ؛ اگر کاربر لاگین باشد خودکار به `/dashboard` هدایت می‌شود                                                      |
| `src/app/globals.css`                        | استایل پایهٔ Tailwind                                                                                                            |
| `src/app/auth/login/page.tsx`                | فرم لاگین + دکمه‌های حساب دمو (`DEMO_ACCOUNTS`) — این آرایه در جلسهٔ قبل با ایمیل‌های واقعی دیتابیس هماهنگ شد                    |
| `src/app/auth/register/page.tsx`             | فرم ثبت‌نام استاد/دانشجو                                                                                                         |
| `src/app/dashboard/layout.tsx`               | Layout مشترک بخش داشبورد: `Sidebar` + `TopBar` + بررسی احراز هویت                                                                |
| `src/app/dashboard/page.tsx`                 | داشبورد شخصی استاد/دانشجو؛ اگر نقش کاربر `admin` باشد بلافاصله (client-side) به `/dashboard/admin` ری‌دایرکت و چیزی رندر نمی‌کند |
| `src/app/dashboard/applications/page.tsx`    | (فقط دانشجو) لیست درخواست‌های عضویت ارسالی با وضعیت‌شان                                                                          |
| `src/app/dashboard/messages/page.tsx`        | صفحهٔ پیام‌ها؛ از `ChatPanel` برای نمایش گفتگوی پروژه استفاده می‌کند                                                             |
| `src/app/dashboard/my-projects/page.tsx`     | (فقط استاد) لیست پروژه‌های خودش با گزینهٔ مدیریت                                                                                 |
| `src/app/dashboard/my-projects/new/page.tsx` | فرم ساخت پروژهٔ جدید توسط استاد                                                                                                  |
| `src/app/dashboard/profile/page.tsx`         | ویرایش پروفایل (بیوگرافی، علایق، زبان‌های برنامه‌نویسی و ...)                                                                    |
| `src/app/dashboard/projects/page.tsx`        | (فقط دانشجو) کاتالوگ پروژه‌های باز برای درخواست عضویت                                                                            |
| `src/app/dashboard/projects/[id]/page.tsx`   | جزئیات کامل یک پروژه، اعضا، و اقدام (درخواست عضویت / ویرایش)                                                                     |

### 🆕 صفحات پنل ادمین

| فایل                                           | مسئولیت واقعی                                                                                               |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/app/dashboard/admin/page.tsx`             | صفحهٔ اصلی پنل ادمین: کارت‌های آمار، لیست دپارتمان‌های مدیریت‌شده، لیست همهٔ پروژه‌ها، و بخش تأیید/رد استاد |
| `src/app/dashboard/admin/departments/page.tsx` | رابط کاربری انتخاب/ذخیرهٔ دپارتمان‌های تحت مدیریت این ادمین                                                 |
| `src/app/dashboard/admin/messages/page.tsx`    | رابط چت مستقیم ادمین با اساتید هم‌دپارتمان                                                                  |

> **حذف‌شده:** مسیر قدیمی `src/app/admin/` (بدون `dashboard/`) که یک نسخهٔ تکراری و نیمه‌کاره از همین پنل بود و هیچ‌جای دیگری از برنامه به آن لینک نمی‌داد؛ در جلسهٔ رفع‌اشکال قبلی به‌طور کامل حذف شد چون اطلاعات منحصربه‌فردی نداشت.

## 6. Components

### Layout

| فایل                                | مسئولیت واقعی                                                                                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/layout/Sidebar.tsx` | منوی کناری؛ آیتم‌های نویگیشن بر اساس نقش کاربر فیلتر می‌شوند (`roles` روی هر `NavItem`) — ادمین فقط «Admin Panel» را می‌بیند (اصلاح‌شده در جلسهٔ قبل) |
| `src/components/layout/TopBar.tsx`  | نوار بالای صفحات داشبورد؛ عنوان/زیرعنوان صفحه + دکمهٔ باز کردن منو در موبایل                                                                          |

### Projects

| فایل                                            | مسئولیت واقعی                                           |
| ----------------------------------------------- | ------------------------------------------------------- |
| `src/components/projects/ApplicationsPanel.tsx` | نمایش و تأیید/رد درخواست‌های عضویت یک پروژه (سمت استاد) |
| `src/components/projects/ChatPanel.tsx`         | رابط چت گروهی یک پروژه با polling/رفرش پیام‌ها          |
| `src/components/projects/ProjectCard.tsx`       | کارت نمایش خلاصهٔ یک پروژه در لیست‌ها                   |

### Providers

| فایل                                         | مسئولیت واقعی                                                 |
| -------------------------------------------- | ------------------------------------------------------------- |
| `src/components/providers/QueryProvider.tsx` | فراهم‌کنندهٔ `QueryClient` برای TanStack React Query در کل اپ |

### UI (کامپوننت‌های عمومی و بدون منطق دامنه)

| فایل                               | مسئولیت واقعی                                   |
| ---------------------------------- | ----------------------------------------------- |
| `src/components/ui/Avatar.tsx`     | نمایش آواتار (تصویر یا حروف اول نام)            |
| `src/components/ui/Badge.tsx`      | برچسب رنگی برای وضعیت‌ها (pending/approved/...) |
| `src/components/ui/Button.tsx`     | دکمهٔ استاندارد با واریانت‌های رنگی             |
| `src/components/ui/Card.tsx`       | کانتینر کارت با `CardBody`                      |
| `src/components/ui/EmptyState.tsx` | نمایش حالت «داده‌ای وجود ندارد»                 |
| `src/components/ui/ErrorState.tsx` | نمایش خطا با دکمهٔ تلاش مجدد                    |
| `src/components/ui/Input.tsx`      | فیلد ورودی استاندارد (و `Textarea`)             |
| `src/components/ui/Modal.tsx`      | پنجرهٔ Modal عمومی                              |
| `src/components/ui/Skeleton.tsx`   | Loading skeleton برای کارت‌ها و آمار            |

## 7. Contexts

| فایل                              | مسئولیت واقعی                                                                             |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/contexts/AuthContext.tsx`    | وضعیت کاربر لاگین‌شده (`user`, `loading`) + توابع `login`/`register`/`logout` سمت کلاینت  |
| `src/contexts/SidebarContext.tsx` | باز/بسته بودن منوی کناری در حالت موبایل؛ با تغییر مسیر (`usePathname`) خودکار بسته می‌شود |

## 8. Database

| فایل               | مسئولیت واقعی                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/db/index.ts`  | ساخت `Pool` اتصال Postgres (Neon) + نمونهٔ `db` از Drizzle؛ Pool را در `globalThis` کش می‌کند تا در حالت dev با هر hot-reload، Connection Pool جدید ساخته نشود      |
| `src/db/schema.ts` | تعریف تمام جداول: `users`, `projects`, `applications`, `projectMembers`, `chatMessages`, `adminDepartments`, `directMessages` + enumها (نقش، وضعیت پروژه، دپارتمان) |
| `src/db/seed.ts`   | اسکریپت مستقیم seed (`npx tsx src/db/seed.ts`)؛ در جلسهٔ قبل نام/ایمیل‌های دمو با دیتابیس واقعی و با `api/seed/route.ts` هماهنگ شد                                  |

## 9. Library / Utilities

| فایل                        | مسئولیت واقعی                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/auditLog.ts`       | ثبت رویدادهای حساس (مثل تأیید/رد درخواست) برای پیگیری بعدی                                                                                               |
| `src/lib/auth.ts`           | `hashPassword`/`comparePassword` (bcrypt)، صدور/خواندن JWT از کوکی `auth_token`، تابع `getAuthUser()` که در همهٔ API routeها و صفحات سرور استفاده می‌شود |
| `src/lib/rateLimit.ts`      | Rate-limit ساده در حافظه (per-email و per-IP) برای جلوگیری از تلاش مکرر لاگین                                                                            |
| `src/lib/utils.ts`          | توابع کمکی عمومی: `cn` (ترکیب کلاس Tailwind)، `formatDate`، `formatTimeAgo`، `statusColor`/`statusLabel`                                                 |
| `src/lib/validation.ts`     | اعتبارسنجی و پاک‌سازی ورودی‌ها (ایمیل، عنوان/توضیحات پروژه، دپارتمان‌های مجاز `DEPARTMENTS`)                                                             |
| `src/lib/permissions.ts` 🆕 | تابع `requireAdmin()` — بررسی نقش ادمین و پرتاب خطای `UNAUTHORIZED`/`FORBIDDEN`                                                                          |

> ⚠️ فایل `src/lib/constants.ts` که در سند قبلی حدس زده شده بود، در پروژهٔ واقعی **وجود ندارد**.

## نمای کلی معماری (به‌روزشده)

```text
ResearchHub
│
├── Pages / UI
│   └── src/app/                    (شامل بخش admin زیر dashboard/)
├── Reusable Components
│   └── src/components/
├── Frontend State
│   └── src/contexts/
├── API
│   └── src/app/api/                (شامل api/admin/* — پنل ادمین دپارتمانی)
├── Business / Security Utilities
│   └── src/lib/                    (شامل permissions.ts)
├── Database
│   ├── src/db/
│   ├── src/drizzle/                (migration اولیه)
│   └── src/migrations/             (migration پنل ادمین)
└── Configuration / Deployment
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── drizzle.config.ts
    └── vercel.json
```

## وضعیت اعتبار سند

این نسخه، بر خلاف نسخهٔ قبلی، بر اساس **خواندن مستقیم و کامل محتوای هر ۷۹ فایل پروژه** نوشته شده — نه حدس از روی اسم فایل. جایی که طی رفع‌اشکال‌های قبلی، توضیحات فایل تغییر کرده (مثلاً حذف `src/app/admin/`، هماهنگ‌سازی داده‌های seed، محدودسازی نویگیشن ادمین)، در همین سند علامت‌گذاری شده است.
