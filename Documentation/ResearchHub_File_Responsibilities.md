# ResearchHub — مسئولیت فایل‌ها (نسخهٔ همگام با ساختار فعلی)

> تاریخ بازبینی: ۲۰۲۶-۰۹-۲۴
>
> این سند مسئولیت فایل‌ها را بر اساس مسیر و محتوای کد ارسالی تنظیم می‌کند. مواردی که صرفاً از مستندات قبلی شناخته شده‌اند از مواردی که در archive کد مشاهده شده‌اند تفکیک شده‌اند.

## 1. فایل‌های ریشه

| فایل                   | مسئولیت                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| `README.md`            | معرفی کلی پروژه، stack و مسیر مستندات                              |
| `PILOT_SETUP.md`       | راه‌اندازی Pilot و اطلاعات عملیاتی مربوط به حساب‌های دمو           |
| `SECURITY.md`          | مستند امنیتی پروژه                                                 |
| `package.json`         | وابستگی‌ها و scriptهای npm                                         |
| `package-lock.json`    | قفل نسخهٔ وابستگی‌ها                                               |
| `next.config.ts`       | تنظیمات Next.js                                                    |
| `next-env.d.ts`        | تایپ‌های تولیدی Next.js                                            |
| `tsconfig.json`        | تنظیمات TypeScript                                                 |
| `tsconfig.tsbuildinfo` | cache/build information؛ نباید فایل source تلقی شود                |
| `drizzle.config.ts`    | تنظیمات Drizzle                                                    |
| `drizzle.config.json`  | تنظیمات Drizzle به JSON؛ هم‌پوشان با `.ts` و نیازمند تصمیم نگهداری |
| `postcss.config.mjs`   | تنظیمات PostCSS                                                    |
| `vercel.json`          | تنظیمات deployment روی Vercel                                      |

## 2. Middleware

### `src/middleware.ts`

مسئولیت:

- matcher روی `/api/:path*`
- اعمال محدودیت اندازهٔ body
- محدودیت حدود 100KB برای bodyهای غیر-multipart
- محدودیت حدود 11MB برای multipart
- بررسی Origin/Referer برای mutationهای API
- جلوگیری از برخی درخواست‌های cross-origin ناخواسته

این middleware جایگزین authorization route نیست؛ هر route باید auth و authorization خود را نیز بررسی کند.

## 3. Authentication API

### `src/app/api/auth/login/route.ts`

مسئولیت:

- normalize کردن email
- rate limit با email و IP
- جست‌وجوی user
- مقایسهٔ bcrypt
- بررسی `professorStatus`
- جلوگیری از ورود استاد `pending` یا `rejected`
- صدور JWT
- تنظیم `auth_token` cookie
- ثبت audit eventهای login

### `src/app/api/auth/register/route.ts`

مسئولیت:

- ثبت دانشجو/استاد
- validate کردن داده‌های ثبت‌نام
- hash کردن password
- ساخت استاد با `professorStatus=pending`
- ساخت دانشجو با وضعیت approved
- rate limit ثبت‌نام
- جلوگیری از email تکراری

### `src/app/api/auth/logout/route.ts`

حذف/منقضی کردن cookie احراز هویت.

### `src/app/api/auth/me/route.ts`

- GET: اطلاعات safe کاربر فعلی
- PATCH: ویرایش پروفایل کاربر فعلی
- عدم expose کردن password

### `src/app/api/auth/password/route.ts`

- بررسی password فعلی
- validate password جدید
- rate limit
- hash و ذخیره password جدید

نکته: JWTهای قبلی در معماری stateless فعلی به‌صورت خودکار revoke نمی‌شوند.

## 4. Project API

### `src/app/api/projects/route.ts`

- GET: فهرست پروژه‌ها با scope بر اساس نقش، visibility و فیلترهای query
- POST: ایجاد پروژه
- ثبت creator در `project_members`
- ایجاد invite token برای private project در صورت نیاز

### `src/app/api/projects/[id]/route.ts`

- GET: جزئیات project
- PATCH: ویرایش توسط owner
- DELETE: حذف توسط owner

مرجع ownership:

```text
projects.creatorId
projects.creatorRole
```

### `src/app/api/projects/[id]/members/[userId]/route.ts`

حذف member توسط owner؛ owner خودش نباید حذف شود.

### `src/app/api/projects/[id]/invite/route.ts`

دعوت owner به student از طریق username و ساخت application با source=`owner_invite`.

## 5. Applications / Invitations

### `src/app/api/applications/route.ts`

لیست applicationهای ارسال‌شده توسط دانشجوی فعلی.

### `src/app/api/projects/[id]/applications/route.ts`

لیست applicationهای یک project برای owner.

### `src/app/projects/[id]/applications/[appId]/route.ts`

> مسیر واقعی در پروژه:
>
> `src/app/api/projects/[id]/applications/[appId]/route.ts`

مسئول approve/reject application توسط owner یا cancel کردن application توسط student صاحب آن.

در approve، کنترل ظرفیت باید به‌صورت transaction/lock انجام شود.

### `src/app/api/invitations/route.ts`

لیست invitationهای دریافتی student.

### `src/app/api/invitations/[id]/route.ts`

قبول/رد invitation توسط student صاحب invitation.

### `src/app/api/invites/[token]/route.ts`

ورود از private invite token و ایجاد membership پس از بررسی token، نقش، membership و ظرفیت.

## 6. Project Chat

### `src/app/api/projects/[id]/messages/route.ts`

- GET: پیام‌های پروژه برای member/owner
- POST: ایجاد پیام
- نوع پیام: `text` یا `progress_update`
- rate limit پیام

### `src/app/api/projects/[id]/messages/[messageId]/route.ts`

- PATCH: ویرایش پیام توسط صاحب آن
- DELETE: حذف پیام توسط صاحب آن
- ثبت audit برای عملیات حساس

## 7. Project Files

### `src/app/api/projects/[id]/files/route.ts`

- GET: فهرست فایل‌های project برای member/owner
- POST: multipart upload
- بررسی context
- بررسی دسترسی
- بررسی size/type
- ارسال فایل به Vercel Blob
- ذخیره metadata در `project_files`

حداکثر فایل:

```text
10MB
```

contextهای معتبر:

```text
chat
document
deliverable
```

### `src/app/api/projects/[id]/files/[fileId]/route.ts`

- DELETE
- فقط uploader یا owner
- حذف object از Blob
- حذف metadata از DB
- ثبت audit

نکته امنیتی: Blob در کد فعلی با public access استفاده می‌شود؛ بنابراین URL فایل از authorization API مستقل است.

## 8. Dashboard

### `src/app/api/dashboard/stats/route.ts`

آمار dashboard را بر اساس role محاسبه می‌کند:

- professor: پروژه‌ها، applicationها و اعضا
- student: applicationها و projectهای joined

## 9. Admin API

### `src/app/api/admin/stats/route.ts`

آمار admin با department scope برای user counts و project metrics طبق قرارداد فعلی.

### `src/app/api/admin/departments/route.ts`

خواندن و تغییر department scope ادمین.

### `src/app/api/admin/professors/route.ts`

- GET: استادان در scope ادمین
- PATCH: تغییر `professorStatus`
- POST: در کد فعلی disabled/403

### `src/app/api/admin/projects/route.ts`

فهرست projectهای admin برای supervision فعلی؛ این route در معماری فعلی university-wide است و نباید با faculty overview یکی فرض شود.

### `src/app/api/admin/messages/route.ts`

پیام مستقیم admin ↔ professor با بررسی role و department scope.

### `src/app/api/admin/faculty-overview/route.ts`

**کنترل مرکز پروژه‌های دانشکده / Faculty Project Control Center — V2**

قواعد مشاهده در کد فعلی:

1. فقط admin احراز هویت‌شده.
2. فقط پروژه‌های `public`.
3. فقط پروژه‌هایی که `creatorRole = professor` دارند.
4. پروژه باید حداقل یک عضو از یکی از departmentهای اختصاص‌یافته به admin داشته باشد.
5. پروژه‌های student-created حتی اگر public باشند در این endpoint نمایش داده نمی‌شوند.
6. پروژه‌های private در این endpoint نمایش داده نمی‌شوند.
7. cross-faculty project می‌تواند برای adminهای departmentهای مشارکت‌کننده نمایش داده شود.
8. `admin/projects` تحت تأثیر این فیلتر قرار نمی‌گیرد.

خروجی شامل:

```text
departments
summary
attention
projects
```

### منطق `attention` در V2

در نسخهٔ فعلی فقط یک reason معتبر است:

```text
مهلت انجام گذشته است
```

پروژهٔ completed حتی با deadline گذشته، overdue محسوب نمی‌شود.

`capacityAvailable` فقط اطلاعاتی است و باعث اضافه شدن project به `attention` نمی‌شود.

`lastActivityAt` از جدیدترین timestamp بین:

- `projects.updatedAt`
- آخرین `chat_messages.created_at`

به‌دست می‌آید؛ محتوای پیام برای این محاسبه خوانده نمی‌شود.

## 10. Health / Seed

### `src/app/api/health/route.ts`

یک DB check ساده (`select 1`) برای health-check.

### `src/app/api/seed/route.ts`

endpoint حساس seed با `SEED_SECRET`.

قابلیت‌های آن می‌تواند شامل:

- seed
- clear
- force
- list
- check-schema

باشد.

این endpoint باید در production به‌عنوان عملیات حساس در نظر گرفته شود.

## 11. Database

### `src/db/index.ts`

- ساخت اتصال PostgreSQL
- ساخت Drizzle DB
- cache کردن Pool در `globalThis` برای جلوگیری از ایجاد poolهای تکراری در dev hot reload

### `src/db/schema.ts`

تعریف:

```text
users
projects
applications
projectMembers
chatMessages
projectFiles
adminDepartments
directMessages
```

همچنین enumها و relationهای مربوط به این مدل‌ها.

### `src/db/seed.ts`

seed مستقیم دیتابیس از طریق script.

## 12. Security / Business Utilities

### `src/lib/auth.ts`

- bcrypt hash/compare
- JWT sign/verify
- `getAuthUser()`
- خواندن auth token از HttpOnly cookie

### `src/lib/permissions.ts`

- بررسی نقش admin
- تولید خطاهای unauthorized/forbidden برای policyهای admin

### `src/lib/projectAccess.ts`

محاسبه:

```text
project
isOwner
isMember
```

و فراهم کردن پایهٔ authorization برای endpointهای project-scoped.

### `src/lib/validation.ts`

اعتبارسنجی:

- auth
- profile
- username
- department
- project
- project type
- visibility
- interests
- programming languages
- file context/type/size

### `src/lib/rateLimit.ts`

Rate limit in-memory برای:

- login
- register
- password change
- project chat

نکته: این limiter در deployment توزیع‌شده global نیست.

### `src/lib/auditLog.ts`

ثبت eventهای حساس به شکل structured log.

### `src/lib/messages.fa.ts`

متن‌ها/پیام‌های فارسی مرتبط با UI/API.

### `src/lib/utils.ts`

utilityهای عمومی UI/data مانند class merging و formatهای تاریخ/وضعیت.

## 13. Frontend

### `src/contexts/AuthContext.tsx`

state و عملیات auth در client:

```text
user
loading
login
register
logout
```

### `src/contexts/SidebarContext.tsx`

کنترل باز/بسته بودن sidebar و هماهنگی با مسیر.

### `src/components/layout/*`

ساختار layout داشبورد:

- Sidebar
- TopBar

### `src/components/projects/*`

UI پروژه:

- ApplicationsPanel
- ChatPanel
- ProjectCard
- ProjectFiles

### `src/components/providers/QueryProvider.tsx`

ارائهٔ TanStack React Query.

### `src/components/ui/*`

کامپوننت‌های عمومی UI.

## 14. صفحات Admin

```text
src/app/dashboard/admin/page.tsx
src/app/dashboard/admin/departments/page.tsx
src/app/dashboard/admin/messages/page.tsx
```

- dashboard admin
- مدیریت department scope
- پیام مستقیم با professors

## 15. نمای معماری فایل‌ها

```text
ResearchHub
│
├── src/app/
│   ├── pages
│   └── api/
│       ├── auth
│       ├── projects
│       ├── applications
│       ├── invitations
│       ├── invites
│       ├── dashboard
│       ├── admin
│       │   ├── stats
│       │   ├── departments
│       │   ├── professors
│       │   ├── projects
│       │   ├── messages
│       │   └── faculty-overview
│       ├── health
│       └── seed
│
├── src/components/
├── src/contexts/
├── src/lib/
│   ├── auth
│   ├── permissions
│   ├── projectAccess
│   ├── validation
│   ├── rateLimit
│   └── auditLog
│
├── src/db/
│   ├── index
│   ├── schema
│   └── seed
│
└── src/middleware.ts
```

## 16. مواردی که نباید در مسئولیت فایل‌ها با هم قاطی شوند

### `/api/admin/projects` ≠ `/api/admin/faculty-overview`

اولی برای لیست پروژه‌های admin با قرارداد فعلی خود است؛ دومی یک کنترل‌سنتر scoped برای پروژه‌های public و professor-created است.

### `projectMembers` ≠ `applications`

application درخواست/دعوت است؛ membership عضویت تأییدشده است.

### API authorization ≠ Blob authorization

API می‌تواند دسترسی metadata را محدود کند، اما فایل Blob فعلی public است.

### `creatorId` ≠ `professorId`

مالکیت فعلی project بر اساس `creatorId/creatorRole` است؛ `professorId` backward compatibility است.

## 17. وضعیت سند

این نسخه برای هماهنگ‌سازی دو سند اصلی مستندسازی با ساختار فعلی ایجاد شده است. هر تغییر جدید در API، مدل داده، مسیر admin یا ساختار فایل باید همزمان در این دو سند بررسی شود تا manifest و مسئولیت فایل‌ها دوباره از هم فاصله نگیرند.
