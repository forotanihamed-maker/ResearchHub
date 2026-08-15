# ResearchHub — خلاصه مسئولیت فایل‌ها

> این سند بر اساس `project_file_manifest.md` تهیه شده است.
> توضیحات هر فایل بر اساس نام فایل، مسیر و ساختار پروژه است؛ محتوای ۶۵ فایل پروژه هنوز مستقیماً بررسی نشده است. بنابراین این سند یک نقشهٔ اولیه است، نه مستندات قطعی کد.

## 1. فایل‌های ریشه پروژه

| فایل | مسئولیت احتمالی |
|---|---|
| `PILOT_SETUP.md` | راهنمای راه‌اندازی و آماده‌سازی نسخه Pilot |
| `README.md` | معرفی پروژه و اطلاعات کلی |
| `SECURITY.md` | مستندات و نکات امنیتی |
| `drizzle.config.json` | تنظیمات Drizzle به فرمت JSON؛ در Manifest به‌عنوان فایل تکراری احتمالی علامت‌گذاری شده |
| `drizzle.config.ts` | تنظیمات Drizzle برای دیتابیس |
| `next-env.d.ts` | تعریف‌های TypeScript موردنیاز Next.js |
| `next.config.ts` | تنظیمات Next.js |
| `package.json` | وابستگی‌ها و scriptهای پروژه |
| `package-lock.json` | قفل نسخه وابستگی‌های npm |
| `postcss.config.mjs` | تنظیمات PostCSS |
| `project_structure.txt` | مستند ساختار پروژه |
| `tsconfig.json` | تنظیمات TypeScript |
| `vercel.json` | تنظیمات Deployment در Vercel |

## 2. Middleware

| فایل | مسئولیت احتمالی |
|---|---|
| `src/middleware.ts` | کنترل درخواست‌ها در سطح Middleware؛ معمولاً برای احراز هویت، محافظت از مسیرها یا کنترل دسترسی |

## 3. API Routes

| فایل | مسئولیت احتمالی |
|---|---|
| `src/app/api/applications/route.ts` | مدیریت درخواست‌های عضویت/اپلیکیشن پروژه |
| `src/app/api/auth/login/route.ts` | ورود کاربران |
| `src/app/api/auth/logout/route.ts` | خروج کاربران |
| `src/app/api/auth/me/route.ts` | دریافت اطلاعات کاربر فعلی |
| `src/app/api/auth/register/route.ts` | ثبت‌نام کاربران |
| `src/app/api/dashboard/stats/route.ts` | ارائه آمار Dashboard |
| `src/app/api/health/route.ts` | بررسی سلامت سرویس و دیتابیس |
| `src/app/api/projects/route.ts` | ایجاد/دریافت پروژه‌ها |
| `src/app/api/projects/[id]/route.ts` | عملیات مربوط به یک پروژه مشخص |
| `src/app/api/projects/[id]/applications/route.ts` | مدیریت درخواست‌های یک پروژه |
| `src/app/api/projects/[id]/applications/[appId]/route.ts` | مدیریت یک درخواست مشخص |
| `src/app/api/projects/[id]/messages/route.ts` | پیام‌های چت پروژه |
| `src/app/api/seed/route.ts` | اجرای Seed برای داده‌های اولیه/نمونه |

## 4. صفحات `src/app`

| فایل | مسئولیت احتمالی |
|---|---|
| `src/app/layout.tsx` | Layout اصلی برنامه |
| `src/app/page.tsx` | صفحه اصلی |
| `src/app/globals.css` | استایل‌های عمومی |
| `src/app/auth/login/page.tsx` | رابط کاربری ورود |
| `src/app/auth/register/page.tsx` | رابط کاربری ثبت‌نام |
| `src/app/dashboard/layout.tsx` | Layout بخش Dashboard |
| `src/app/dashboard/page.tsx` | صفحه اصلی Dashboard |
| `src/app/dashboard/applications/page.tsx` | نمایش درخواست‌ها |
| `src/app/dashboard/messages/page.tsx` | صفحه پیام‌ها/چت |
| `src/app/dashboard/my-projects/page.tsx` | پروژه‌های کاربر |
| `src/app/dashboard/my-projects/new/page.tsx` | ایجاد پروژه جدید |
| `src/app/dashboard/profile/page.tsx` | پروفایل |
| `src/app/dashboard/projects/page.tsx` | فهرست پروژه‌ها |
| `src/app/dashboard/projects/[id]/page.tsx` | جزئیات پروژه |

## 5. Components

### Layout

| فایل | مسئولیت احتمالی |
|---|---|
| `src/components/layout/Sidebar.tsx` | منوی کناری Dashboard |
| `src/components/layout/TopBar.tsx` | نوار بالایی Dashboard |

### Projects

| فایل | مسئولیت احتمالی |
|---|---|
| `src/components/projects/ApplicationsPanel.tsx` | نمایش/مدیریت درخواست‌های پروژه |
| `src/components/projects/ChatPanel.tsx` | رابط چت پروژه |
| `src/components/projects/ProjectCard.tsx` | کارت نمایش پروژه |

### Providers

| فایل | مسئولیت احتمالی |
|---|---|
| `src/components/providers/QueryProvider.tsx` | فراهم کردن TanStack React Query |

### UI

| فایل | مسئولیت احتمالی |
|---|---|
| `src/components/ui/Avatar.tsx` | نمایش آواتار |
| `src/components/ui/Badge.tsx` | نمایش برچسب/وضعیت |
| `src/components/ui/Button.tsx` | دکمه قابل استفاده مجدد |
| `src/components/ui/Card.tsx` | کارت عمومی |
| `src/components/ui/EmptyState.tsx` | وضعیت بدون داده |
| `src/components/ui/ErrorState.tsx` | نمایش خطا |
| `src/components/ui/Input.tsx` | فیلد ورودی |
| `src/components/ui/Modal.tsx` | پنجره Modal |
| `src/components/ui/Skeleton.tsx` | Loading Skeleton |

## 6. Contexts

| فایل | مسئولیت احتمالی |
|---|---|
| `src/contexts/AuthContext.tsx` | وضعیت احراز هویت در Frontend |
| `src/contexts/SidebarContext.tsx` | وضعیت Sidebar |

## 7. Database

| فایل | مسئولیت احتمالی |
|---|---|
| `src/db/index.ts` | اتصال دیتابیس و Export کردن Drizzle DB |
| `src/db/schema.ts` | تعریف جداول و ساختار دیتابیس |
| `src/db/seed.ts` | Seed مستقیم دیتابیس |

## 8. Library / Utilities

| فایل | مسئولیت احتمالی |
|---|---|
| `src/lib/auditLog.ts` | ثبت رویدادهای مهم |
| `src/lib/auth.ts` | منطق و توابع احراز هویت |
| `src/lib/constants.ts` | ثابت‌های مشترک |
| `src/lib/rateLimit.ts` | محدودسازی درخواست‌ها |
| `src/lib/utils.ts` | توابع کمکی عمومی |
| `src/lib/validation.ts` | اعتبارسنجی ورودی‌ها |

## نمای کلی معماری

```text
ResearchHub
│
├── Pages / UI
│   └── src/app/
├── Reusable Components
│   └── src/components/
├── Frontend State
│   └── src/contexts/
├── API
│   └── src/app/api/
├── Business / Security Utilities
│   └── src/lib/
├── Database
│   └── src/db/
└── Configuration / Deployment
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── drizzle.config.ts
    └── vercel.json
```

## وضعیت اعتبار سند

این فایل برای شناخت سریع ساختار پروژه و برنامه‌ریزی تغییرات مناسب است.

برای قطعی کردن مسئولیت هر فایل باید محتوای خود فایل بررسی شود. طبق Manifest، فقط `drizzle.config.json` و `drizzle.config.ts` از نظر محتوا بررسی شده‌اند و ۶۵ فایل دیگر هنوز فقط از نظر مسیر شناخته شده‌اند.
