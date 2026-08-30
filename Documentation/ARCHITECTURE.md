# ResearchHub — مستند معماری

> این سند برای توسعه‌دهنده‌ای نوشته شده که تازه به این پروژه ملحق می‌شود و باید در کمترین زمان بفهمد سیستم چطور کار می‌کند.

## ۱. دید کلی یک‌خطی

پلتفرمی که اساتید پروژه‌ی پژوهشی تعریف می‌کنند، دانشجویان برای عضویت درخواست می‌دهند، استاد تأیید/رد می‌کند، و تیم تشکیل‌شده در یک چت گروهی با هم کار می‌کنند. یک لایه‌ی ادمین دپارتمانی هم روی این سیستم نظارت می‌کند.

## ۲. استک فنی

| لایه | تکنولوژی | نسخه |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.6 |
| UI | React | 19.2.6 |
| استایل | Tailwind CSS | 4.1.17 |
| ORM | Drizzle ORM | 0.45.2 |
| دیتابیس | PostgreSQL (میزبانی: Neon) | — |
| احراز هویت | JWT (jsonwebtoken) + bcryptjs | — |
| مدیریت state سرور | TanStack React Query | 5.101.3 |
| دیپلوی | Vercel | — |

نکته‌ی مهم برای دیپلوی روی Vercel: توابع API به‌صورت **Serverless** اجرا می‌شوند — یعنی هیچ حافظه‌ی درون‌فرایندی بین درخواست‌ها تضمین‌شده نیست. این نکته مستقیماً روی محدودیت rate-limiting توضیح‌داده‌شده در بخش ۷ اثر می‌گذارد.

## ۳. ساختار پوشه‌ها

```
src/
├── middleware.ts              # فقط روی /api/* اجرا می‌شود
├── app/
│   ├── layout.tsx             # Layout ریشه (فونت، QueryProvider، AuthProvider)
│   ├── page.tsx                # لندینگ — اگر لاگین باشی به /dashboard می‌رود
│   ├── auth/{login,register}/  # صفحات عمومی احراز هویت
│   ├── dashboard/
│   │   ├── layout.tsx          # Sidebar + TopBar + گارد احراز هویت
│   │   ├── page.tsx            # داشبورد استاد/دانشجو (ادمین را ری‌دایرکت می‌کند)
│   │   ├── projects/           # کاتالوگ پروژه (دانشجو) / جزئیات پروژه
│   │   ├── my-projects/        # پروژه‌های خود استاد
│   │   ├── applications/       # درخواست‌های ارسالی دانشجو
│   │   ├── messages/           # چت تیمی
│   │   ├── profile/            # ویرایش پروفایل
│   │   └── admin/              # پنل ادمین (overview, departments, messages)
│   └── api/                    # همه‌ی endpointها — بخش ۶
├── components/
│   ├── layout/                 # Sidebar, TopBar
│   ├── projects/                # ApplicationsPanel, ChatPanel, ProjectCard
│   ├── ui/                      # کامپوننت‌های عمومی بدون منطق دامنه
│   └── providers/QueryProvider.tsx
├── contexts/                   # AuthContext, SidebarContext
├── db/                          # schema.ts, index.ts, seed.ts
├── lib/                         # auth, validation, rateLimit, permissions, auditLog, utils
├── drizzle/                     # migration اولیه (SQL تولیدشده توسط drizzle-kit)
└── migrations/                  # migrationهای دستی بعدی (مثل پنل ادمین)
```

## ۴. مدل داده (خلاصه)

```
users ──┬── projects (professorId) ──┬── applications (projectId, studentId → users)
        │                            ├── projectMembers (projectId, userId → users)
        │                            └── chatMessages (projectId, senderId → users)
        ├── adminDepartments (adminId → users)   [یک ادمین ↔ چند دپارتمان]
        └── directMessages (senderId, recipientId → users)  [ادمین ↔ استاد]
```

نکات مهم طراحی که باید بدانید:

- **`department` یک enum ثابت پستگرس با ۶ مقدار هاردکد است**، نه یک جدول. یعنی برای اضافه/تغییر دپارتمان‌ها باید migration جدید نوشت. برای گسترش به دانشکده‌ها/دانشگاه‌های مختلف، این محدودیت اصلی معماری فعلی است (به بخش ۸ نگاه کنید).
- استاد هنگام ساخت پروژه **به‌صورت خودکار عضو `projectMembers` همان پروژه هم می‌شود** — این برای این است که هم بتواند در چت شرکت کند و هم چک‌های مالکیت یکسان کار کنند. به همین دلیل، هر جا که "تعداد اعضا" شمرده می‌شود (برای `maxMembers`، برای آمار داشبورد)، ردیف خود استاد **عمداً از شمارش حذف می‌شود** — این یک تصمیم طراحی است، نه باگ، ولی برای هر توسعه‌دهنده‌ی جدید گیج‌کننده است اگر از قبل نداند.
- `professorStatus` (`pending` / `approved` / `rejected`) فقط برای نقش `professor` معنا دارد؛ دانشجوها همیشه `approved` ساخته می‌شوند. استاد `pending` اصلاً نمی‌تواند لاگین کند (نه این‌که لاگین کند و دسترسی محدود داشته باشد).

## ۵. جریان احراز هویت

1. لاگین/ثبت‌نام موفق → یک JWT در کوکی HttpOnly به‌نام `auth_token` ست می‌شود (`maxAge`: ۷ روز، `secure` فقط در production).
2. هر صفحه‌ی سرور یا API route با `getAuthUser()` (در `lib/auth.ts`) این کوکی را می‌خواند و decode می‌کند.
3. **هیچ session سمت سرور یا جدول refresh-token‌ای وجود ندارد** — همه‌چیز stateless و مبتنی بر خود JWT است. یعنی revoke کردن یک توکن قبل از انقضایش (مثلاً اگر یک ادمین بخواهد فوری یک نشست را باطل کند) از نظر فعلی سیستم ممکن نیست.
4. میان‌افزار (`middleware.ts`) **فقط روی `/api/*`** matcher دارد؛ محافظت از خود صفحات (`/dashboard/*`, `/dashboard/admin/*`) در بدنه‌ی همان `page.tsx`ها با فراخوانی مستقیم `getAuthUser()` انجام می‌شود، نه در میان‌افزار.

## ۶. جریان اصلی کسب‌وکار (Project Lifecycle)

```
استاد پروژه می‌سازد (status: open)
        │
دانشجو درخواست عضویت می‌دهد (application: pending)
        │
        ├─→ استاد تأیید می‌کند ──→ application: approved
        │                          └─→ projectMembers رکورد جدید
        │                          └─→ اگر اولین تأیید بود: project.status → in_progress
        │
        └─→ استاد رد می‌کند ──→ application: rejected
```

تأیید عضویت داخل یک **تراکنش دیتابیسی با row lock (`FOR UPDATE`)** انجام می‌شود (`applications/[appId]/route.ts`) تا دو تأیید هم‌زمان روی یک پروژه، ظرفیت `maxMembers` را رد نکنند — این یکی از دقیق‌ترین بخش‌های کد از نظر مدیریت همزمانی است.

## ۷. امنیت — چیزی که هست و چیزی که نیست

| مکانیزم | وضعیت |
|---|---|
| هش پسورد | bcryptjs، پیاده‌سازی‌شده و درست |
| JWT در کوکی HttpOnly | بله (نه در localStorage) |
| Rate limiting لاگین/چت | بله، ولی **درون‌حافظه‌ای** (`lib/rateLimit.ts`) — روی Vercel serverless، این محافظت فقط در محدوده‌ی یک instance گرم تضمین می‌شود، نه سراسری. برای پایلوت کوچک کافی است؛ برای ترافیک واقعی باید با Redis (مثل Upstash) جایگزین شود. **توجه:** این محدودیت روی `register` هنوز اعمال نشده. |
| محافظت CSRF | بله — `middleware.ts` روی همه‌ی متدهای تغییردهنده (`POST`/`PUT`/`PATCH`/`DELETE`) هدر `Origin` (با fallback به `Referer`) را با آدرس واقعی سرور مقایسه می‌کند و در صورت عدم تطابق `403` می‌دهد |
| محدودیت حجم درخواست | بله — همان `middleware.ts` با `Content-Length` درخواست‌های بزرگ‌تر از ۱۰۰KB را با `413` رد می‌کند (محدودیت شناخته‌شده: کلاینت با `chunked transfer-encoding` این چک را دور می‌زند) |
| Audit log | بله (`lib/auditLog.ts`) — رویدادهای حساس (لاگین ناموفق، تأیید/رد درخواست، تغییر وضعیت استاد) ثبت می‌شوند |
| RBAC (نقش‌محور) | بله، هم در `middleware`/`getAuthUser` و هم به‌صورت مضاعف در خود هر query (نه فقط مخفی‌کردن UI) |
| محدودسازی دپارتمانی ادمین | بله، از طریق `lib/permissions.ts` و جدول `admin_departments` |
| تأیید ایمیل هنگام ثبت‌نام | ❌ وجود ندارد — هرکسی با هر ایمیلی می‌تواند ثبت‌نام کند |
| Forgot / Reset password | ❌ وجود ندارد |
| تست خودکار امنیتی | ❌ وجود ندارد — سناریوهای IDOR/دسترسی فقط با بررسی دستی تأیید شده‌اند |
| Refresh token / ابطال فوری نشست | ❌ وجود ندارد |

## ۸. بزرگ‌ترین محدودیت معماری فعلی — تک‌مستأجری بودن (Single-tenant)

کل schema فرض می‌کند **یک** نهاد آموزشی وجود دارد (یک enum ثابت دپارتمان، بدون مفهوم «دانشگاه» یا «دانشکده» به‌عنوان یک موجودیت مستقل در دیتابیس). اگر قرار است این سامانه به چند دانشکده/دانشگاه مختلف فروخته شود، مهم‌ترین تغییر معماری پیش‌رو این است:

- اضافه‌کردن یک جدول `organizations` (یا `institutions`)
- تبدیل `department` از enum ثابت به یک جدول `departments` با `organizationId`
- افزودن `organizationId` به `users` و فیلتر کردن تمام query‌ها بر همین اساس

این تغییر، بزرگ‌ترین ریفکتور ساختاری‌ای است که پیش از فروش به بیش از یک نهاد باید انجام شود.
