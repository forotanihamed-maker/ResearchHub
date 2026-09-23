# ResearchHub — مستند معماری (نسخه بازبینی‌شده)

> تاریخ بازبینی: 2026-09-24
>
> این سند بر اساس ساختار واقعی کد ارسالی و schema فعلی نوشته شده است. تمرکز آن روی معماری اجرایی، مرزهای امنیتی، داده و جریان‌های اصلی است.

## 1. نمای کلی

ResearchHub یک پلتفرم همکاری پژوهشی/آموزشی با سه نقش اصلی است:

- `student`
- `professor`
- `admin`

جریان اصلی:

```text
Browser
  │
  ▼
Next.js App Router
  ├── Pages / UI
  ├── API Routes (/api/*)
  └── Middleware
        │
        ├── Body-size guard
        └── Origin/CSRF guard
              │
              ▼
         Route Handler
              │
        ┌─────┴─────┐
        ▼           ▼
   Auth/Policy   Drizzle ORM
                    │
                    ▼
                PostgreSQL
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
   Application data        Vercel Blob
                           (project files)
```

## 2. لایه‌های اصلی

### 2.1 Frontend

بر پایه Next.js App Router و React.

مسئولیت‌ها:

- صفحات احراز هویت
- dashboard
- project UI
- applications
- chat
- profile
- admin UI

Frontend مرجع نهایی authorization نیست؛ routeهای API باید دوباره authorization را enforce کنند.

### 2.2 API Layer

مسیرها زیر:

```text
src/app/api/
```

تقسیم دامنه:

```text
auth/
projects/
applications/
invitations/
invites/
dashboard/
admin/
health/
seed/
```

### 2.3 Middleware

فایل:

```text
src/middleware.ts
```

Matcher:

```text
/api/:path*
```

Middleware برای متدهای:

```text
POST PUT PATCH DELETE
```

دو کار انجام می‌دهد:

1. محدودیت اندازه body بر اساس `Content-Length`
2. بررسی Origin/Referer برای دفاع CSRF

محدودیت اندازه:

- JSON و سایر bodyهای غیر-multipart: 100KB
- multipart: 11MB

دلیل سقف 11MB برای multipart این است که فایل route سقف 10MB دارد و multipart boundary/metadata نیز باید جا داشته باشد.

### 2.4 Auth Layer

فایل:

```text
src/lib/auth.ts
```

مکانیزم:

- bcryptjs برای password
- JWT برای session
- HttpOnly cookie به نام `auth_token`
- `getAuthUser()` برای خواندن و verify کردن JWT

JWT payload:

```text
userId
email
role
name
```

هیچ server-side session table یا refresh-token table در schema فعلی وجود ندارد.

### 2.5 Authorization Layer

فایل:

```text
src/lib/permissions.ts
src/lib/projectAccess.ts
```

دو سطح اصلی:

- role-based authorization
- resource ownership / membership

`getProjectAccess()` اطلاعات زیر را محاسبه می‌کند:

```text
project
isOwner
isMember
```

این helper در فایل‌ها و سایر endpointهای project-scoped استفاده می‌شود.

### 2.6 Validation

فایل:

```text
src/lib/validation.ts
```

مسئول:

- ID parsing
- name/email/password
- department
- username
- project type/visibility
- interests
- programming languages
- file context/type/size

File limits:

```text
MAX_FILE_SIZE_BYTES = 10MB
```

Allowed extensions:

```text
pdf
doc
docx
zip
png
jpg
jpeg
```

### 2.7 Rate Limiting

فایل:

```text
src/lib/rateLimit.ts
```

پیاده‌سازی فعلی in-memory است.

این نکته در Vercel بسیار مهم است:

```text
Instance A ≠ Instance B
```

بنابراین rate limit تضمین‌شده و global نیست.

موارد فعلی:

- login: IP + email
- register: IP
- password change: user
- project chat: user + project

برای scale بالاتر باید shared store در نظر گرفته شود.

---

# 3. مدل داده

Schema اصلی:

```text
users
admin_departments
projects
applications
project_members
chat_messages
project_files
direct_messages
```

## users

هویت و پروفایل:

```text
id
name
email
password
role
professorStatus
avatar
bio
department
university
interests[]
programmingLanguages[]
username
createdAt
updatedAt
```

`email` و `username` unique هستند.

## admin_departments

scope ادمین را تعیین می‌کند:

```text
adminId
department
```

یک admin می‌تواند چند department داشته باشد.

## projects

مرجع اصلی مالکیت:

```text
creatorId
creatorRole
```

`professorId` هنوز در schema وجود دارد، ولی طبق comment کد برای backward compatibility است و source of truth جدید نیست.

فیلدهای مهم:

```text
status
type
visibility
inviteToken
maxMembers
deadline
```

## applications

هم درخواست دانشجو و هم دعوت owner را مدل می‌کند:

```text
source =
  student_application
  owner_invite
```

## project_members

اعضای تأییدشده.

کلید مرکب:

```text
(projectId, userId)
```

سازنده پروژه نیز هنگام ساخت پروژه در این جدول ثبت می‌شود.

## chat_messages

پیام‌های پروژه.

## project_files

metadata فایل:

```text
projectId
uploaderId
fileName
fileUrl
fileSize
context
chatMessageId
```

bytes فایل در DB نیست؛ در Vercel Blob قرار می‌گیرد.

## direct_messages

پیام مستقیم admin ↔ professor.

این سیستم از project chat جداست.

---

# 4. Project lifecycle

```text
Create project
     │
     ▼
   open
     │
     ├── student application ──► pending
     │                              │
     │                       owner approves
     │                              ▼
     │                         membership
     │                              │
     │                              ▼
     │                        in_progress
     │
     ├── owner invite ───────► pending
     │
     └── private invite link ─► membership
```

در تأیید application از transaction + row lock روی project استفاده می‌شود تا دو درخواست همزمان ظرفیت را بیش از `maxMembers` نکنند.

---

# 5. File architecture

```text
Client
  │ multipart/form-data
  ▼
POST /api/projects/[id]/files
  │
  ├── auth
  ├── membership
  ├── context validation
  ├── deliverable policy
  ├── 10MB check
  ├── extension/MIME allow-list
  │
  ▼
Vercel Blob
  │
  ▼
project_files row
```

### نکته مهم امنیتی

کد فعلی Blob را با:

```text
access: "public"
```

آپلود می‌کند.

بنابراین:

- API برای metadata دسترسی را کنترل می‌کند.
- اما `fileUrl` یک URL عمومی Blob است.
- اگر URL فایل private افشا شود، authorization API لزوماً جلوی دسترسی مستقیم به Blob را نمی‌گیرد.

این مورد باید در threat model و تصمیم معماری آینده ثبت شود.

---

# 6. Admin architecture

Admin دو مفهوم جدا دارد:

### Role

```text
users.role = admin
```

### Scope

```text
admin_departments
```

پس:

```text
admin authorization
        =
role=admin
+
department scope
```

اما همه endpointها scope یکسان ندارند.

نمونه:

- `/api/admin/professors` → scoped
- `/api/admin/stats` → user counts scoped، project count سراسری
- `/api/admin/projects` → در کد فعلی project list سراسری
- `/api/admin/messages` → scope بر اساس ارتباط admin ↔ professor

این تفاوت باید هنگام ممیزی امنیتی حفظ شود و فرض «همه APIهای admin دپارتمانی‌اند» اشتباه است.

---

# 7. Authentication lifecycle

```text
Register student
    └─► approved
        └─► JWT + cookie

Register professor
    └─► pending
        └─► no login token
              │
              ▼
        admin approval
              │
              ▼
            login
              │
              ▼
          JWT + cookie
```

در login:

```text
professorStatus != approved
        │
        ├── pending  → 403
        └── rejected → 403
```

JWT stateless است؛ تغییر `professorStatus` در DB توکن صادرشده قبلی را به‌صورت خودکار invalidate نمی‌کند.

---

# 8. Deployment assumptions

Environment variables استفاده‌شده در کد:

```text
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN
BLOB_READ_WRITE_TOKEN
SEED_SECRET
NODE_ENV
```

حداقل dependencyهای عملیاتی:

- PostgreSQL
- Vercel runtime
- Vercel Blob برای فایل‌ها

`JWT_SECRET` fallback ندارد و نبود آن باعث خطای runtime هنگام load شدن auth module می‌شود.

---

# 9. Single-tenant boundary

Schema فعلی یک organization/institution مستقل ندارد.

`department` یک PostgreSQL enum ثابت با 6 مقدار است.

در نتیجه معماری فعلی:

```text
one deployment
one fixed department universe
```

است و multi-tenant واقعی نیست.

برای multi-tenant شدن، تغییرات آینده احتمالاً شامل:

```text
organizations
departments
organizationId on users/projects/...
```

و بازنگری تمام queryهای authorization/scope خواهد بود.

---

# 10. معماری مشاهده‌شده در حال حاضر

### نقاط تثبیت‌شده

- resource ownership برای پروژه‌ها بر پایه `creatorId`
- membership جداگانه
- admin scope جداگانه
- application + invitation در یک مدل
- project chat مستقل
- direct admin-professor messaging
- file metadata در DB و bytes در Blob
- auth stateless JWT

### محدودیت‌های معماری

- rate limiting توزیع‌شده نیست.
- refresh token / revocation وجود ندارد.
- email verification وجود ندارد.
- password reset وجود ندارد.
- automated security test suite در کد ارسالی مشاهده نشد.
- فایل‌ها با public Blob access ذخیره می‌شوند.
- seed endpoint از نظر عملیاتی حساس است.
- audit log به stdout وابسته است و سیستم tamper-proof/compliance audit نیست.
- multi-tenant واقعی وجود ندارد.

---

# 11. قواعد عملیاتی برای تغییرات آینده

هر تغییر production باید این موارد را مشخص کند:

1. چه چیزی تغییر می‌کند؟
2. چرا؟
3. چه داده‌ای تحت تأثیر است؟
4. ریسک چیست؟
5. rollback چگونه است؟
6. verification چگونه انجام می‌شود؟
7. آیا migration لازم است؟
8. آیا authorization جدید لازم است؟
9. آیا audit event لازم است؟
10. آیا API contract تغییر می‌کند؟

برای تغییرات دیتابیس یا حذف داده، عملیات destructive بدون تأیید انسانی انجام نشود.
