# ResearchHub

### پلتفرم شکل‌دهی و مدیریت همکاری‌های پژوهشی استاد و دانشجو

ResearchHub یک پلتفرم وب برای **تعریف پروژه‌های پژوهشی، جذب و انتخاب دانشجو، تشکیل تیم و ادامه همکاری در یک فضای مشترک** است.

هدف اصلی سیستم این است که فرآیند همکاری پژوهشی استاد و دانشجو را از ارتباطات پراکنده و غیرساختاریافته به یک workflow مشخص و قابل پیگیری تبدیل کند.

---

## فهرست مطالب

- [معرفی](#معرفی)
- [مسئله](#مسئله)
- [راه‌حل](#راهحل)
- [قابلیت‌های فعلی](#قابلیتهای-فعلی)
- [نقش‌های کاربری](#نقشهای-کاربری)
- [Workflow اصلی](#workflow-اصلی)
- [معماری کلی](#معماری-کلی)
- [Technology Stack](#technology-stack)
- [ساختار پروژه](#ساختار-پروژه)
- [صفحات اصلی](#صفحات-اصلی)
- [API](#api)
- [مدل داده](#مدل-داده)
- [احراز هویت و امنیت](#احراز-هویت-و-امنیت)
- [راه‌اندازی محیط توسعه](#راهاندازی-محیط-توسعه)
- [تنظیم متغیرهای محیطی](#تنظیم-متغیرهای-محیطی)
- [دیتابیس](#دیتابیس)
- [Seed و Demo](#seed-و-demo)
- [بررسی سلامت سیستم](#بررسی-سلامت-سیستم)
- [بررسی قبل از Commit و Deploy](#بررسی-قبل-از-commit-و-deploy)
- [مستندات](#مستندات)
- [محدودیت‌های شناخته‌شده](#محدودیتهای-شناختهشده)
- [وضعیت فعلی محصول](#وضعیت-فعلی-محصول)
- [Future Vision](#future-vision)

---

# معرفی

ResearchHub برای محیط دانشگاهی طراحی شده و سه نقش اصلی دارد:

- **Student**
- **Professor**
- **Admin**

استاد یا دانشجو می‌تواند پروژه ایجاد کند. پروژه می‌تواند عمومی یا خصوصی باشد. دانشجویان می‌توانند برای پروژه‌های عمومی درخواست عضویت ارسال کنند یا از طریق دعوت به پروژه خصوصی بپیوندند.

پس از تشکیل تیم، اعضای پروژه به فضای مشترک شامل:

- Chat
- Files
- Project collaboration

دسترسی دارند.

در کنار این workflow، یک لایه مدیریتی برای Admin وجود دارد که امکان نظارت و مدیریت بخشی از فعالیت‌های دانشگاه را فراهم می‌کند.

---

# مسئله

فرآیند شکل‌گیری همکاری پژوهشی در بسیاری از محیط‌های دانشگاهی به ابزارها و ارتباطات پراکنده وابسته است:

- ایمیل
- ارتباطات شخصی
- گروه‌های پیام‌رسان
- فایل‌های پراکنده
- ارتباطات غیررسمی استاد و دانشجو

در چنین شرایطی معمولاً مشخص نیست:

- چه پروژه‌هایی فعال هستند؛
- کدام پروژه‌ها ظرفیت دارند؛
- چه دانشجویانی درخواست داده‌اند؛
- وضعیت هر درخواست چیست؛
- اعضای یک پروژه چه کسانی هستند؛
- فایل‌ها و ارتباطات پروژه در کجا نگهداری می‌شوند.

ResearchHub تلاش می‌کند این فرآیند را در یک workflow واحد قرار دهد.

---

# راه‌حل

Workflow اصلی ResearchHub به‌صورت زیر است:

```text
Project Definition
       │
       ▼
Student Discovery / Invitation
       │
       ▼
Application / Invitation
       │
       ▼
Professor Review
       │
       ▼
Team Formation
       │
       ▼
Project Collaboration
       │
       ├── Chat
       ├── Files
       └── Progress
```

در سطح مدیریتی نیز:

```text
                    ┌──────────────┐
                    │    Admin     │
                    │  Oversight   │
                    └──────┬───────┘
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
         Students      Professors     Projects
             │             │             │
             └─────────────┴─────────────┘
                     Department Scope
```

---

# قابلیت‌های فعلی

نسخه فعلی یک **MVP وب‌محور قابل اجرا** است و صرفاً یک prototype یا mockup نیست.

## Authentication

- ثبت‌نام
- ورود
- خروج
- مدیریت session
- تشخیص نقش کاربر
- تغییر رمز عبور
- کنترل وضعیت Professor

## Role-Based Access

سیستم سه نقش اصلی دارد:

```text
student
professor
admin
```

دسترسی‌ها بر اساس نقش کنترل می‌شوند و endpointهای حساس فقط به مخفی‌کردن UI متکی نیستند.

---

## Projects

کاربران مجاز می‌توانند پروژه ایجاد کنند.

پروژه‌ها دارای اطلاعاتی مانند:

- عنوان
- توضیحات
- نوع پروژه
- ظرفیت اعضا
- مهلت
- visibility
- creator

هستند.

انواع پروژه فعلی شامل:

```text
thesis
internship
course
research
```

و visibility پروژه می‌تواند:

```text
public
private
```

باشد.

---

## Applications

دانشجو می‌تواند برای پروژه درخواست عضویت ارسال کند.

مالک پروژه می‌تواند درخواست‌ها را بررسی کرده و آنها را:

- تأیید
- رد

کند.

فرآیند approval با کنترل‌های مربوط به مالکیت پروژه و transaction/row locking پیاده‌سازی شده است.

---

## Invitations

دو روش اصلی برای دعوت وجود دارد:

### Direct Invitation

Creator می‌تواند یک دانشجو را مستقیماً با username دعوت کند.

### Private Invite Link

برای پروژه‌های private امکان استفاده از invite token وجود دارد.

دانشجو می‌تواند دعوت دریافتی را:

- قبول
- رد

کند.

---

## Project Members

پس از تشکیل تیم:

- اعضای پروژه ثبت می‌شوند؛
- creator پروژه عضو پروژه محسوب می‌شود؛
- creator می‌تواند اعضای پروژه را مدیریت کند؛
- creator خودش قابل حذف نیست.

---

## Project Chat

هر پروژه فضای گفت‌وگوی گروهی دارد.

پیام‌ها می‌توانند از نوع:

```text
text
progress_update
```

باشند.

دسترسی به chat بر اساس عضویت در پروژه کنترل می‌شود.

---

## Project Files

پروژه دارای فضای فایل است.

فایل‌ها در contextهای مختلف قابل مدیریت هستند:

```text
chat
document
deliverable
```

آپلود فایل با Vercel Blob انجام می‌شود و دسترسی به فایل‌ها بر اساس دسترسی پروژه کنترل می‌شود.

---

# نقش‌های کاربری

## Student

دانشجو می‌تواند:

- پروژه‌های قابل مشاهده را مرور کند؛
- برای پروژه درخواست ارسال کند؛
- وضعیت درخواست‌های خود را مشاهده کند؛
- دعوت‌های دریافتی را مدیریت کند؛
- به پروژه‌هایی که عضو آنهاست دسترسی داشته باشد؛
- در پروژه‌ها با اعضا گفتگو کند؛
- فایل‌های مجاز پروژه را مشاهده/استفاده کند؛
- پروفایل خود را مدیریت کند.

---

## Professor

استاد می‌تواند:

- پروژه ایجاد کند؛
- پروژه‌های خود را مدیریت کند؛
- درخواست‌های دانشجویان را بررسی کند؛
- دانشجویان را دعوت کند؛
- اعضای پروژه را مدیریت کند؛
- در فضای پروژه با اعضا همکاری کند؛
- فایل‌های پروژه را مدیریت کند.

ثبت‌نام Professor نیازمند تأیید Admin است.

---

## Admin

Admin نقش مدیریتی و نظارتی سیستم را دارد.

قابلیت‌های فعلی Admin شامل:

- مشاهده آمار مدیریتی؛
- مدیریت دپارتمان‌های تحت پوشش؛
- مشاهده اساتید در scope مربوطه؛
- تأیید یا رد ثبت‌نام Professor؛
- پیام مستقیم با Professorهای مرتبط؛
- مشاهده پروژه‌ها برای نظارت.

### Department Scope

دسترسی مدیریتی به داده‌های Professor و Student بر اساس دپارتمان‌های تخصیص‌یافته به Admin کنترل می‌شود.

این محدودیت باید در **Server/API layer** اعمال شود و صرفاً یک محدودیت UI نیست.

> توجه: endpoint فعلی `/api/admin/projects` پروژه‌ها را به‌صورت سراسری برای نظارت Admin فهرست می‌کند و در حال حاضر فیلتر دپارتمانی روی این endpoint اعمال نشده است. این رفتار باید به‌عنوان وضعیت فعلی سیستم در نظر گرفته شود، نه به‌عنوان فرضی درباره scope پروژه‌ها.

---

# Workflow اصلی

## 1. ایجاد پروژه

Professor یا Student یک پروژه ایجاد می‌کند.

```text
Create Project
      │
      ├── Project Type
      ├── Visibility
      ├── Capacity
      ├── Deadline
      └── Description
```

---

## 2. پیدا کردن پروژه

دانشجو می‌تواند پروژه‌های قابل مشاهده را بررسی کند.

پروژه‌های private از طریق invite قابل دسترسی هستند.

---

## 3. Application یا Invitation

برای تشکیل تیم دو مسیر اصلی وجود دارد:

```text
Student ──► Application ──► Project Creator
```

یا:

```text
Project Creator ──► Invitation ──► Student
```

---

## 4. تشکیل تیم

Creator درخواست‌ها یا دعوت‌ها را مدیریت می‌کند و اعضای پذیرفته‌شده وارد پروژه می‌شوند.

---

## 5. همکاری

پس از تشکیل تیم، اعضا در فضای پروژه همکاری می‌کنند:

```text
Project
 ├── Members
 ├── Chat
 ├── Files
 └── Progress Messages
```

---

# معماری کلی

ResearchHub یک application مبتنی بر Next.js App Router است.

ساختار کلی:

```text
ResearchHub
│
├── Pages / UI
│   └── src/app/
│
├── Reusable Components
│   └── src/components/
│
├── Client Contexts
│   └── src/contexts/
│
├── API
│   └── src/app/api/
│
├── Business & Security Logic
│   └── src/lib/
│
├── Database
│   ├── src/db/
│   ├── drizzle/
│   └── migrations/
│
└── Configuration
    ├── package.json
    ├── tsconfig.json
    ├── next.config.ts
    ├── drizzle.config.ts
    └── vercel.json
```

جزئیات معماری در:

`ARCHITECTURE.md`

مستند شده است.

---

# Technology Stack

| Layer            | Technology              |
| ---------------- | ----------------------- |
| Framework        | Next.js 16 — App Router |
| UI               | React 19                |
| Styling          | Tailwind CSS 4          |
| ORM              | Drizzle ORM             |
| Database         | PostgreSQL              |
| Database Hosting | Neon                    |
| Authentication   | JWT + bcryptjs          |
| Server State     | TanStack React Query    |
| File Storage     | Vercel Blob             |
| Deployment       | Vercel                  |
| Language         | TypeScript              |

نسخه‌های دقیق dependencyها در `package.json` و جزئیات معماری در `ARCHITECTURE.md` نگهداری می‌شوند.

---

# ساختار پروژه

ساختار مهم `src`:

```text
src/
├── app/
│   ├── auth/
│   │   ├── login/
│   │   └── register/
│   │
│   ├── dashboard/
│   │   ├── applications/
│   │   ├── messages/
│   │   ├── my-projects/
│   │   ├── profile/
│   │   ├── projects/
│   │   └── admin/
│   │
│   ├── invite/
│   └── api/
│
├── components/
│   ├── layout/
│   ├── projects/
│   ├── providers/
│   └── ui/
│
├── contexts/
│   ├── AuthContext.tsx
│   └── SidebarContext.tsx
│
├── db/
│   ├── index.ts
│   ├── schema.ts
│   └── seed.ts
│
├── lib/
│   ├── auth.ts
│   ├── auditLog.ts
│   ├── permissions.ts
│   ├── projectAccess.ts
│   ├── rateLimit.ts
│   ├── utils.ts
│   └── validation.ts
│
└── middleware.ts
```

---

# صفحات اصلی

صفحات فعلی سیستم شامل:

```text
/
├── auth/login
├── auth/register
├── invite/[token]
│
└── dashboard
    ├── applications
    ├── messages
    ├── my-projects
    ├── my-projects/new
    ├── profile
    ├── projects
    ├── projects/[id]
    │
    └── admin
        ├── departments
        └── messages
```

ورود کاربران authenticated از `/dashboard` انجام می‌شود و تجربه صفحه بر اساس role کاربر تعیین می‌شود.

---

# API

APIهای اصلی سیستم در زیر قرار دارند:

```text
/api
├── auth
│   ├── login
│   ├── logout
│   ├── me
│   ├── password
│   └── register
│
├── applications
├── dashboard/stats
├── health
│
├── invitations
│   └── [id]
│
├── invites
│   └── [token]
│
├── projects
│   ├── [id]
│   │   ├── applications
│   │   ├── files
│   │   ├── invite
│   │   ├── members
│   │   └── messages
│
├── admin
│   ├── stats
│   ├── departments
│   ├── professors
│   ├── projects
│   └── messages
│
└── seed
```

مرجع کامل API در فایل:

`API.md`

قرار دارد.

---

# مدل داده

مدل داده اصلی به‌صورت مفهومی:

```text
users
 │
 ├── projects
 │      ├── applications
 │      ├── projectMembers
 │      ├── chatMessages
 │      └── projectFiles
 │
 ├── adminDepartments
 │
 └── directMessages
```

ارتباط اصلی پروژه:

```text
users
  │
  └── projects
        │
        ├── applications
        │
        ├── projectMembers
        │
        ├── chatMessages
        │
        └── projectFiles
```

Admin نیز از طریق `adminDepartments` به دپارتمان‌های تحت مدیریت خود متصل می‌شود.

---

# احراز هویت و امنیت

امنیت یکی از بخش‌های اصلی معماری ResearchHub است.

## Password Security

Passwordها با `bcryptjs` hash می‌شوند و plaintext password در سیستم ذخیره نمی‌شود.

---

## Authentication Token

Session authentication با JWT انجام می‌شود.

Token در cookie با ویژگی‌های امنیتی مناسب نگهداری می‌شود و در localStorage قرار نمی‌گیرد.

---

## Authorization

سیستم از Role-Based Access Control استفاده می‌کند.

دسترسی فقط در frontend کنترل نمی‌شود و endpointهای حساس نیز authorization مربوط به:

- role
- ownership
- membership
- department scope

را بررسی می‌کنند.

---

## Project Access

برای دسترسی به پروژه، ownership و membership بررسی می‌شود.

این موضوع برای جلوگیری از دسترسی غیرمجاز به resourceهای پروژه اهمیت دارد.

---

## Rate Limiting

برای endpointهای حساس rate limiting وجود دارد، از جمله:

- login
- register
- password change
- project messages

محدودیت فعلی درون حافظه‌ای است.

بنابراین در محیط serverless مانند Vercel، این rate limit بین تمام instanceها به‌صورت global تضمین نمی‌شود.

برای مقیاس بالاتر، استفاده از shared store مانند Redis مورد نیاز خواهد بود.

---

## CSRF Protection

Middleware درخواست‌های state-changing مانند:

```text
POST
PUT
PATCH
DELETE
```

را بررسی می‌کند و Origin/Referer را در فرآیند CSRF validation در نظر می‌گیرد.

---

## Request Size Limit

برای درخواست‌ها محدودیت حجم وجود دارد و درخواست‌های بزرگ‌تر از حد تعریف‌شده رد می‌شوند.

این کنترل بر اساس `Content-Length` انجام می‌شود؛ بنابراین محدودیت‌هایی برای درخواست‌هایی که از chunked transfer استفاده می‌کنند وجود دارد.

---

## Audit Logging

برخی رویدادهای حساس سیستم audit می‌شوند، از جمله رویدادهای مربوط به:

- authentication failures
- application approval/rejection
- professor status changes

Audit log فعلی در logging infrastructure برنامه ثبت می‌شود و هنوز یک سیستم مستقل و tamper-proof برای نگهداری بلندمدت audit records نیست.

جزئیات کامل در:

`SECURITY.md`

قرار دارد.

---

# راه‌اندازی محیط توسعه

## پیش‌نیازها

برای اجرای پروژه به موارد زیر نیاز دارید:

- Node.js
- npm
- PostgreSQL-compatible database
- Environment variables مورد نیاز پروژه

---

## نصب وابستگی‌ها

```bash
npm install
```

---

## اجرای Development Server

```bash
npm run dev
```

سپس:

```text
http://localhost:3000
```

را باز کنید.

---

# تنظیم متغیرهای محیطی

اطلاعات حساس نباید داخل source code قرار بگیرند.

متغیرهای محیطی مورد نیاز پروژه شامل تنظیمات اتصال دیتابیس، secret مربوط به JWT و تنظیمات مربوط به سرویس‌های استفاده‌شده در deployment هستند.

نمونه ساختار:

```env
DATABASE_URL=...

JWT_SECRET=...

SEED_SECRET=...
```

در صورت استفاده از Vercel Blob، متغیرهای مربوط به storage نیز باید در محیط deployment تنظیم شوند.

> مقادیر واقعی secretها نباید داخل Repository، README یا سایر فایل‌های version-controlled قرار بگیرند.

---

# دیتابیس

ResearchHub از:

```text
PostgreSQL + Drizzle ORM
```

استفاده می‌کند.

تنظیمات Drizzle در:

```text
drizzle.config.ts
```

قرار دارد.

Schema اصلی در:

```text
src/db/schema.ts
```

قرار دارد.

اتصال دیتابیس در:

```text
src/db/index.ts
```

مدیریت می‌شود.

---

## Database Schema

جداول اصلی فعلی شامل:

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

هستند.

---

## Migrations

Migrationهای پروژه در دو مسیر اصلی قرار دارند:

```text
drizzle/
migrations/
```

Migrationهای موجود بخشی از تاریخچه واقعی schema پروژه هستند و نباید بدون بررسی وابستگی‌های دیتابیس حذف یا بازنویسی شوند.

---

## اعمال Schema

در محیط توسعه، در صورت نیاز می‌توان از Drizzle برای اعمال schema استفاده کرد:

```bash
npx drizzle-kit push
```

برای migrationهای پروژه، قبل از هر تغییر schema باید وضعیت دیتابیس و migrationهای موجود بررسی شود.

---

# Seed و Demo

پروژه دارای seed برای ایجاد داده‌های نمونه و بررسی محیط توسعه/Pilot است.

Seed endpoint از `SEED_SECRET` محافظت می‌شود.

نمونه:

```bash
curl "http://localhost:3000/api/seed?secret=<SEED_SECRET>&action=force"
```

Actionهای موجود برای seed/diagnostics شامل مواردی مانند:

```text
clear
force
list
check-schema
```

هستند.

### نکته امنیتی

Seed endpoint یک endpoint حساس است.

در محیط production نباید آن را بدون کنترل و secret مناسب در دسترس قرار داد و پس از پایان Pilot، در صورت عدم نیاز، باید secret مربوط به seed حذف یا غیرفعال شود.

جزئیات حساب‌های Demo و مراحل Pilot در:

`PILOT_SETUP.md`

نگهداری می‌شود.

---

# بررسی سلامت سیستم

برای بررسی اتصال و سلامت پایه API:

```bash
curl http://localhost:3000/api/health
```

پاسخ موفق باید شامل چیزی مشابه زیر باشد:

```json
{
  "ok": true
}
```

---

# بررسی قبل از Commit و Deploy

قبل از اعلام موفقیت یک تغییر، حداقل بررسی‌های زیر باید انجام شوند:

## TypeScript

```bash
npm run typecheck
```

## Production Build

```bash
npm run build
```

Build باید بدون خطا کامل شود.

در تغییرات حساس همچنین باید workflow مربوطه به‌صورت دستی یا با تست‌های موجود بررسی شود.

---

# تست‌های مهم

در بررسی‌های functional و security، حداقل موارد زیر اهمیت دارند:

### Authentication

- Student login
- Professor login
- Admin login
- Logout
- Session validation
- Password change

### Authorization

- Student cannot access Admin APIs
- Professor cannot access Admin APIs
- Admin can access permitted resources
- Admin cannot access resources خارج از scope مجاز
- User cannot access project resources بدون ownership/membership مناسب

### Projects

- Project creation
- Public project visibility
- Private project invitation
- Application submission
- Application approval/rejection
- Member management
- Chat access
- File access

### Admin

- Admin dashboard
- Department assignment
- Professor approval/rejection
- Admin messaging
- Project oversight

---

# مستندات

Repository باید تا حد امکان دارای مستندات کم، مشخص و قابل اعتماد باشد.

## مستندات اصلی فنی

### `README.md`

نقطه ورود پروژه و معرفی کلی سیستم.

### `ARCHITECTURE.md`

معماری فنی، ساختار پروژه، مدل داده و تصمیمات مهم معماری.

### `API.md`

مرجع endpointهای API.

### `SECURITY.md`

مدل امنیتی، کنترل‌های موجود و محدودیت‌های شناخته‌شده.

### `PILOT_SETUP.md`

راهنمای اجرای Pilot، داده‌های Demo و تنظیمات مربوط به محیط آزمایشی.

---

## مستندات کسب‌وکار

اسناد مربوط به Business Model، Pitch و مسیر تجاری محصول باید از documentation فنی جدا نگهداری شوند.

این اسناد ممکن است شامل مواردی مانند:

- Product Vision
- Business Plan
- Pitch Deck
- Go-to-Market
- Pilot Strategy

باشند.

آنها نباید به‌عنوان source of truth برای قابلیت‌های فعلی نرم‌افزار استفاده شوند.

---

# اصل مهم مستندات

مستندات فنی ResearchHub باید **واقعیت کد فعلی** را توصیف کنند.

بنابراین:

> اگر قابلیتی در Roadmap قرار دارد ولی هنوز در محصول پیاده‌سازی نشده است، نباید در بخش Current Features به‌عنوان قابلیت موجود معرفی شود.

همچنین اسناد مربوط به:

- taskهای قدیمی
- تقسیم کار موقت بین conversationها
- checkpointهای توسعه
- تصمیمات موقتی که دیگر معتبر نیستند
- مسیرهای حذف‌شده
- فرضیات مربوط به فایل‌هایی که دیگر وجود ندارند

نباید به‌عنوان documentation اصلی محصول استفاده شوند.

---

# محدودیت‌های شناخته‌شده

ResearchHub در وضعیت MVP/Pilot قرار دارد و برخی محدودیت‌ها عمداً در این مرحله پذیرفته شده‌اند.

## Email Verification

سیستم فعلی email verification کامل ندارد.

---

## Distributed Rate Limiting

Rate limiting فعلی in-memory است و برای deployment serverless یک shared/global limiter محسوب نمی‌شود.

---

## Audit Retention

Audit logging فعلی برای ثبت رویدادها وجود دارد، اما سیستم مستقل compliance-grade برای retention و tamper-proof audit records نیست.

---

## Automated Security Tests

مدل امنیتی و authorization در کد پیاده‌سازی شده‌اند، اما automated security test suite کامل هنوز وجود ندارد.

---

## Department Model

Department در schema فعلی به‌صورت enum ثابت PostgreSQL تعریف شده است.

بنابراین اضافه یا تغییر ساختار دپارتمان‌ها نیازمند تغییر schema/migration است.

این موضوع در صورت گسترش محصول به دانشگاه‌ها و ساختارهای سازمانی متنوع‌تر، یکی از محدودیت‌های معماری فعلی خواهد بود.

---

## Scope پروژه‌های Admin

بعضی داده‌های Admin بر اساس department scope محدود می‌شوند، اما endpoint فعلی project oversight یعنی:

```text
/api/admin/projects
```

پروژه‌ها را به‌صورت سراسری فهرست می‌کند.

این رفتار باید در هنگام توسعه قابلیت‌های بعدی Admin در نظر گرفته شود.

---

# وضعیت فعلی محصول

ResearchHub در مرحله‌ای قرار دارد که محصول اصلی ساخته شده و تمرکز باید به سمت **اعتبارسنجی در محیط واقعی** حرکت کند.

وضعیت فعلی را می‌توان به‌صورت زیر خلاصه کرد:

```text
Idea
  │
  ▼
Prototype
  │
  ▼
Working MVP
  │
  ▼
Controlled Pilot   ← Current Focus
  │
  ▼
Market Validation
  │
  ▼
Growth
```

هدف مرحله فعلی صرفاً اضافه‌کردن featureهای بیشتر نیست.

تمرکز اصلی:

- اجرای Pilot
- مشاهده رفتار واقعی کاربران
- شناسایی مشکلات workflow
- دریافت feedback
- اندازه‌گیری استفاده واقعی
- اعتبارسنجی ارزش محصول
- اعتبارسنجی مدل کسب‌وکار

است.

---

# Future Vision

موارد این بخش **قابلیت‌های فعلی سیستم نیستند** و صرفاً مسیر توسعه احتمالی محصول را نشان می‌دهند.

## Near Future

در صورت اثبات نیاز واقعی:

- Smart Matching
- مدیریت ظرفیت استاد
- Research Area / Priority Tags
- Task Board
- Research Reports

---

## Long-Term Vision

در صورت اعتبارسنجی بازار و ایجاد زیرساخت مناسب:

- ارتباط دانشگاه و صنعت
- دریافت مسائل پژوهشی از صنعت
- AI-assisted Matching
- تحلیل روندهای پژوهشی
- Project-to-Paper
- Integration با سامانه‌های دانشگاهی
- همکاری بین دانشگاه‌ها
- National Research Talent Graph
- Micro-Grant Marketplace

این قابلیت‌ها نباید قبل از اعتبارسنجی نیاز واقعی به‌عنوان تعهد قطعی محصول تلقی شوند.

---

# Product Direction

ResearchHub در اصل یک سیستم عمومی مدیریت پروژه نیست.

تمرکز اصلی آن:

> **شکل‌دهی، تشکیل و مدیریت همکاری پژوهشی استاد و دانشجو**

است.

بنابراین هسته محصول:

```text
Discover
   ↓
Apply / Invite
   ↓
Select
   ↓
Form Team
   ↓
Collaborate
```

است.

قابلیت‌های آینده باید در صورتی به محصول اضافه شوند که این workflow اصلی را بهبود دهند یا ارزش اثبات‌شده‌ای برای کاربران ایجاد کنند.

---

# Development Principles

برای توسعه ResearchHub چند اصل مهم باید حفظ شوند:

### 1. Source of Truth

کد فعلی و schema واقعی منبع حقیقت قابلیت‌های سیستم هستند.

### 2. Server-Side Authorization

امنیت نباید به UI وابسته باشد.

### 3. Measure Before Optimize

مشکلات performance باید با اندازه‌گیری واقعی بررسی شوند، نه حدس.

### 4. Avoid Feature Bloat

قبل از اضافه‌کردن قابلیت جدید باید نیاز واقعی آن مشخص باشد.

### 5. Keep Documentation Accurate

هر مستندات اصلی باید با وضعیت واقعی پروژه هماهنگ باشد.

### 6. Separate Current Product from Vision

قابلیت‌های آینده باید از قابلیت‌های موجود کاملاً تفکیک شوند.

---

# Deployment

ResearchHub برای deployment روی Vercel طراحی شده است.

معماری deployment به این شکل است:

```text
Browser
   │
   ▼
Vercel / Next.js
   │
   ├── Application / API
   │
   ├── PostgreSQL (Neon)
   │
   └── File Storage (Vercel Blob)
```

در محیط serverless، نباید روی وجود state پایدار در memory یک instance حساب کرد.

این موضوع به‌خصوص برای rate limiting و سایر stateهای in-memory اهمیت دارد.

---

# خلاصه

ResearchHub یک MVP وب‌محور برای مدیریت workflow همکاری پژوهشی استاد و دانشجو است.

هسته فعلی محصول شامل:

```text
Authentication
      +
Role-Based Access
      +
Projects
      +
Applications
      +
Invitations
      +
Team Formation
      +
Project Chat
      +
Project Files
      +
Admin Oversight
```

است.

معماری فعلی بر پایه:

```text
Next.js
+
React
+
TypeScript
+
PostgreSQL
+
Drizzle ORM
+
JWT
+
TanStack React Query
+
Vercel
```

ساخته شده است.

مرحله فعلی محصول:

> **Working MVP → Controlled Pilot → Real-World Validation**

است.

هدف نهایی، تبدیل ResearchHub به یک زیرساخت متمرکز برای شکل‌دهی و مدیریت همکاری‌های پژوهشی در محیط دانشگاهی است؛ اما توسعه قابلیت‌های آینده باید بر اساس نیاز و شواهد واقعی بازار انجام شود.

---

## Related Documentation

- `ARCHITECTURE.md` — معماری و ساختار فنی
- `API.md` — مرجع API
- `SECURITY.md` — امنیت و محدودیت‌های امنیتی
- `PILOT_SETUP.md` — راه‌اندازی Pilot و Demo
- `docs/business/` — مستندات کسب‌وکار و Product Vision

---

**ResearchHub**

> From research opportunity to real collaboration.
