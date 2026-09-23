# ResearchHub — مرجع API (بر اساس کد فعلی)

> تاریخ بازبینی: 2026-09-24
>
> مبنای این سند، فایل‌های واقعی `src/app/api`، `src/lib` و `src/db/schema.ts` در نسخه‌ی ارسالی فعلی است. هرجا کد و مستندات قبلی اختلاف داشته‌اند، این سند رفتار کد فعلی را مبنا قرار می‌دهد.
>
> Base path همه‌ی APIها: `/api`
>
> احراز هویت اصلی با JWT در کوکی HttpOnly به نام `auth_token` انجام می‌شود. APIهای تغییردهنده از middleware مرکزی CSRF/Origin نیز عبور می‌کنند.

## 1. قراردادهای عمومی

### Authentication

JWT شامل این فیلدهاست:

```text
userId
email
role = professor | student | admin
name
```

توکن با `JWT_SECRET` امضا می‌شود و مدت اعتبار آن از `JWT_EXPIRES_IN` خوانده می‌شود؛ مقدار پیش‌فرض در کد `7d` است.

کوکی:

- `httpOnly: true`
- `secure: true` در production
- `sameSite: "lax"`
- `path: "/"`
- `maxAge: 7 روز` در مسیرهای login/register فعلی

> نکته: تغییر `JWT_EXPIRES_IN` می‌تواند مدت اعتبار خود JWT را تغییر دهد، اما کوکی login/register در کد فعلی `maxAge` هفت‌روزه دارد.

### کدهای HTTP رایج

| کد | معنی در ResearchHub |
|---|---|
| 200 | موفق |
| 201 | ایجاد موفق |
| 400 | ورودی نامعتبر |
| 401 | احراز هویت نشده |
| 403 | احراز هویت شده ولی مجاز نیست / یا CSRF |
| 404 | منبع/route از دید API پیدا نشد |
| 409 | تعارض وضعیت یا ظرفیت |
| 413 | بدنه‌ی درخواست بزرگ‌تر از سقف middleware |
| 429 | Rate limit |
| 500 | خطای داخلی |

---

# 2. Authentication

## `POST /api/auth/register`

ثبت‌نام دانشجو یا استاد.

Body:

```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "role": "student | professor",
  "department": "string",
  "university": "string?",
  "bio": "string?",
  "interests": "string[]?",
  "programmingLanguages": "string[]?"
}
```

قواعد مهم:

- اگر `role=professor` باشد، حساب با `professorStatus=pending` ساخته می‌شود.
- برای استاد توکن login صادر نمی‌شود و تا تأیید ادمین امکان ورود وجود ندارد.
- اگر `role=student` باشد، `professorStatus=approved` ثبت می‌شود و JWT صادر و در cookie قرار می‌گیرد.
- `role` هر مقدار دیگری باشد در کد فعلی عملاً به `student` تبدیل می‌شود؛ بنابراین کلاینت باید فقط دو مقدار رسمی را ارسال کند.
- ایمیل normalize می‌شود.
- پسورد با bcrypt و cost factor 12 هش می‌شود.
- rate limit: حداکثر 5 تلاش در 15 دقیقه به‌ازای IP.
- ایمیل تکراری: `409`.

گروه‌های آموزشی فعلی از enum دیتابیس می‌آیند:

- مهندسی نرم‌افزار
- هوش مصنوعی
- شبکه‌های کامپیوتری
- معماری سیستم‌های کامپیوتری
- امنیت اطلاعات
- علوم داده

---

## `POST /api/auth/login`

Body:

```json
{
  "email": "string",
  "password": "string"
}
```

رفتار:

- email normalize می‌شود.
- rate limit ایمیل: 5 تلاش در 15 دقیقه.
- rate limit IP: 20 تلاش در 15 دقیقه.
- اعتبارسنجی password با bcrypt.
- استاد `pending`: `403`
- استاد `rejected`: `403`
- credentials نامعتبر: `401`
- موفق: `200` + JWT + cookie `auth_token`

Audit eventهای مرتبط:

- `login_rate_limited`
- `login_failed`
- `professor_pending_login`
- `professor_rejected_login`
- `login_success`

> علت خطای `403` با پیام «حساب استاد در انتظار تأیید است» مستقیماً در همین route پیاده‌سازی شده است و به مقدار `users.professorStatus` وابسته است.

---

## `POST /api/auth/logout`

کوکی `auth_token` را حذف می‌کند.

---

## `GET /api/auth/me`

نیازمند login.

خروجی اطلاعات safe user را برمی‌گرداند و password را شامل نمی‌کند.

---

## `PATCH /api/auth/me`

نیازمند login.

فیلدهای قابل تغییر:

```json
{
  "name": "string?",
  "bio": "string | null",
  "department": "department",
  "university": "string | null",
  "username": "string | null",
  "interests": "string[]",
  "programmingLanguages": "string[]"
}
```

قواعد:

- username: فقط `a-z A-Z 0-9 _` و 3 تا 30 کاراکتر.
- username تکراری: `409`.
- interests: حداکثر 8 مورد، هر مورد 2 تا 60 کاراکتر، trim و deduplicate.
- programmingLanguages: حداکثر 8 مورد و فقط از فهرست ثابت کد.
- department باید یکی از enumهای معتبر باشد.

---

## `PATCH /api/auth/password`

Body:

```json
{
  "currentPassword": "string",
  "newPassword": "string"
}
```

قواعد:

- کاربر باید authenticated باشد.
- پسورد فعلی دوباره بررسی می‌شود.
- پسورد جدید حداقل 8 کاراکتر است.
- پسورد جدید باید با قبلی متفاوت باشد.
- rate limit: 5 تلاش در 15 دقیقه به‌ازای کاربر.
- rate limit: `429` + `Retry-After`.

> در کد فعلی تغییر password باعث ابطال JWTهای قبلی نمی‌شود؛ JWT stateless است.

---

# 3. Projects

## `GET /api/projects`

نیازمند login.

ادمین در این route `403` می‌گیرد و باید از APIهای admin استفاده کند.

Query:

| پارامتر | مقدار | رفتار |
|---|---|---|
| `status` | `open`, `in_progress`, `completed`, `all` | فیلتر وضعیت |
| `search` | متن | جست‌وجوی سمت سرور |
| `chat=true` | true | فقط پروژه‌های کاربر که عضو آن‌هاست |
| `my=true` | true | فقط پروژه‌های ساخته‌شده توسط خود کاربر |

دسترسی عمومی پروژه‌ها و پروژه‌های متعلق به کاربر بر اساس role/ownership/membership در route اعمال می‌شود.

---

## `POST /api/projects`

فقط `student` و `professor`.

Body:

```json
{
  "title": "string",
  "description": "string",
  "type": "thesis | internship | course | research",
  "visibility": "public | private",
  "maxMembers": 1,
  "deadline": "ISO date | null | \"\""
}
```

قواعد validation:

- title: 3..255
- description: 10..5000
- maxMembers: 1..50
- type: یکی از چهار نوع
- visibility: `public | private`
- deadline باید معتبر باشد.

پیش‌فرض‌های کد:

- professor: type=`research`
- student: type=`course`
- visibility=`public`
- maxMembers=`5`
- status=`open`

سازنده به‌صورت خودکار در `projectMembers` نیز ثبت می‌شود.

برای پروژه private، invite token ساخته می‌شود.

---

## `GET /api/projects/[id]`

نیازمند login.

برای private project:

- owner یا member → مجاز
- سایر کاربران → `404`

خروجی شامل اطلاعات پروژه، اعضا، `memberCount`، وضعیت application کاربر، `isMember` و `isOwner` است.

---

## `PATCH /api/projects/[id]`

فقط owner پروژه.

فیلدهای قابل تغییر:

```json
{
  "title": "string?",
  "description": "string?",
  "status": "open | in_progress | completed",
  "type": "thesis | internship | course | research",
  "visibility": "public | private",
  "maxMembers": "integer",
  "deadline": "ISO date | null | \"\"",
  "regenerateInviteToken": true,
  "revokeInviteToken": true
}
```

- کاهش ظرفیت پایین‌تر از تعداد اعضای فعلی رد می‌شود.
- تغییر visibility می‌تواند token را ایجاد/حذف کند.
- regenerate token → token جدید.
- revoke token → token حذف می‌شود.

---

## `DELETE /api/projects/[id]`

فقط owner.

حذف project به دلیل foreign keyهای cascade می‌تواند روابط وابسته را نیز حذف کند.

Audit event:

- `project_deleted`

---

# 4. Applications

## `GET /api/applications`

فقط دانشجو.

درخواست‌های متعلق به همان دانشجو و با source=`student_application`.

---

## `POST /api/projects/[id]/applications`

فقط دانشجو.

Body:

```json
{
  "message": "string?"
}
```

حداکثر message در validation مربوط به route: 2000 کاراکتر.

خطاهای کلیدی:

- project نبود: `404`
- project باز نبود: `404`
- عضو قبلی: `409`
- application pending قبلی: `409`
- ظرفیت پر: `409`

موفق: `201`.

---

## `GET /api/projects/[id]/applications`

فقط owner پروژه.

درخواست‌ها همراه اطلاعات دانشجو برگردانده می‌شوند.

---

## `PATCH /api/projects/[id]/applications/[appId]`

دو حالت:

### owner پروژه

```json
{ "status": "approved | rejected" }
```

### دانشجوی صاحب application

```json
{ "status": "cancelled" }
```

فقط application در وضعیت `pending` قابل تغییر است.

تأیید application با transaction و lock روی project انجام می‌شود تا race condition ظرفیت کنترل شود.

Audit:

- `application_approved`
- `application_rejected`

---

# 5. Invitations

## `POST /api/projects/[id]/invite`

فقط owner.

Body:

```json
{ "username": "string" }
```

- username باید معتبر باشد.
- هدف باید student باشد.
- owner نمی‌تواند خودش را دعوت کند.
- عضو قبلی: `409`
- invitation/application pending قبلی: `409`
- ظرفیت پر: `409`

source application برابر `owner_invite` است.

---

## `GET /api/invitations`

کاربر authenticated دعوت‌های دریافت‌شده‌ی خود را می‌گیرد.

فقط applicationهایی با `source=owner_invite`.

---

## `PATCH /api/invitations/[id]`

فقط دانشجوی صاحب invitation.

```json
{ "status": "approved | rejected" }
```

در approve:

- membership ساخته می‌شود.
- invitation approved می‌شود.
- اگر project باز باشد، status به `in_progress` تغییر می‌کند.
- ظرفیت پر: `409`.

---

## `POST /api/invites/[token]`

فقط student.

token باید به project private معتبر متصل باشد.

- قبلاً عضو → پاسخ موفق بدون membership جدید.
- ظرفیت پر → `409`
- موفق → membership ایجاد می‌شود و project در صورت `open` به `in_progress` می‌رود.

---

# 6. Project Members

## `DELETE /api/projects/[id]/members/[userId]`

فقط owner.

- owner خودش قابل حذف نیست.
- ID نامعتبر → `400`
- project/member ناموجود → `404`
- عدم مالکیت → `403`

---

# 7. Project Chat

## `GET /api/projects/[id]/messages`

فقط member/owner.

حداکثر 50 پیام آخر.

خروجی برای UI به ترتیب زمانی صعودی مرتب می‌شود.

---

## `POST /api/projects/[id]/messages`

فقط member/owner.

Body:

```json
{
  "content": "string",
  "type": "text | progress_update"
}
```

- content: 1..2000
- type نامعتبر در route به `text` تبدیل می‌شود.
- rate limit: 20 پیام در دقیقه برای `(projectId,userId)`.
- عبور از limit → `429`, `Retry-After: 60`.

---

## `PATCH /api/projects/[id]/messages/[messageId]`

فقط صاحب همان پیام و در چارچوب دسترسی پروژه.

Audit:

- `message_edited`

## `DELETE /api/projects/[id]/messages/[messageId]`

فقط صاحب همان پیام و در چارچوب دسترسی پروژه.

Audit:

- `message_deleted`

---

# 8. Project Files

## `GET /api/projects/[id]/files`

فقط member/owner.

Query اختیاری:

```text
context=chat
context=document
context=deliverable
```

مرتب‌سازی: جدیدترین به قدیمی‌ترین.

---

## `POST /api/projects/[id]/files`

Body باید `multipart/form-data` باشد.

Fields:

- `file`
- `context`
- `chatMessageId` در صورت نیاز

Context:

- `chat`
- `document`
- `deliverable`

سقف فایل: 10MB.

پسوندهای مجاز:

- pdf
- doc
- docx
- zip
- png
- jpg
- jpeg

MIME نیز در برابر allow-list بررسی می‌شود.

قانون deliverable:

- فقط owner
- فقط وقتی project=`completed`

Storage:

- Vercel Blob
- metadata در `project_files`

متغیر محیطی لازم:

```text
BLOB_READ_WRITE_TOKEN
```

Audit:

- `project_file_uploaded`

> نکته امنیتی مهم: route فعلی Vercel Blob را با `access: "public"` آپلود می‌کند؛ بنابراین URL فایل‌ها public است. مجوز API برای مشاهده metadata برقرار است، اما خود URL Blob در صورت افشا می‌تواند خارج از API نیز قابل دسترسی باشد.

---

## `DELETE /api/projects/[id]/files/[fileId]`

فقط:

- uploader فایل
- یا owner پروژه

Blob حذف می‌شود؛ اگر حذف Blob خطا دهد، route همچنان تلاش می‌کند رکورد DB را حذف کند.

Audit:

- `project_file_deleted`

---

# 9. Admin

## `GET /api/admin/stats`

فقط admin.

- students: فقط دپارتمان‌های assigned
- professors: فقط دپارتمان‌های assigned
- projects: سراسری
- departments: scope فعلی admin

اگر admin هیچ department نداشته باشد، counts صفر و departments خالی است.

---

## `GET /api/admin/departments`

فقط admin.

خروجی:

```json
{
  "departments": ["..."],
  "selected": ["..."]
}
```

## `PATCH /api/admin/departments`

Body:

```json
{ "departments": ["..."] }
```

لیست scope قبلی کامل جایگزین می‌شود و حداقل یک department معتبر لازم است.

---

## `GET /api/admin/professors`

فقط admin.

فقط استادانی که department آن‌ها در scope همان admin است.

## `POST /api/admin/professors`

عمداً disabled است و `403` می‌دهد.

اصل کسب‌وکار:

> استاد خودش ثبت‌نام می‌کند؛ admin فقط status را approve/reject/pending می‌کند.

## `PATCH /api/admin/professors`

Body:

```json
{
  "id": 123,
  "status": "approved | rejected | pending"
}
```

فقط استادان داخل scope admin.

Audit:

- `professor_status_changed`

---

## `GET /api/admin/projects`

فقط admin.

پروژه‌ها را برای supervision برمی‌گرداند. این route در کد فعلی فیلتر department برای admin ندارد.

---

## `GET /api/admin/messages`

برای admin و professor.

- admin بدون professorId → فهرست استادان مجاز
- admin با professorId → پیام‌های همان گفت‌وگو
- professor بدون professorId → فهرست adminهای دارای scope مرتبط
- professor با professorId → پیام‌های همان گفت‌وگو
- student → `403`

## `POST /api/admin/messages`

Body:

```json
{
  "recipientId": 123,
  "content": "string"
}
```

حداکثر content: 2000.

- admin فقط به professor داخل scope خودش
- professor فقط به admin دارای department scope مربوط به استاد
- student مجاز نیست

---

# 10. Dashboard

## `GET /api/dashboard/stats`

نیازمند login.

### professor

- totalProjects
- openProjects
- inProgressProjects
- completedProjects
- totalApplications
- pendingApplications
- totalMembers

`totalMembers` خود professor را نمی‌شمارد.

### student

- totalApplications
- pendingApplications
- approvedApplications
- projectsJoined
- openProjects

> نکته: route فعلی برای roleهای غیر-professor وارد branch دانشجو می‌شود؛ بنابراین admin نباید این endpoint را جایگزین dashboard اختصاصی admin در نظر بگیرد.

---

# 11. Health

## `GET /api/health`

بدون نیاز به login.

در DB یک `select 1` اجرا می‌کند.

موفق:

```json
{ "ok": true }
```

خطای DB:

```json
{ "ok": false }
```

با status `500`.

---

# 12. Seed

## `GET /api/seed`
## `POST /api/seed`

این endpoint حساس است.

بدون `SEED_SECRET`:

- `404`

secret از یکی از این دو ورودی پذیرفته می‌شود:

```text
x-seed-secret: <SEED_SECRET>
```

یا:

```text
?secret=<SEED_SECRET>
```

Audit:

- `seed_denied`
- `seed_executed`

Actionهای GET موجود در route:

- بدون action
- `clear`
- `force`
- `list`
- `check-schema`

`clear`/`force` می‌توانند داده‌های دیتابیس را حذف یا بازسازی کنند.

**قاعده عملیاتی:** این endpoint در production باید پس از seed اولیه غیرفعال/حذف یا حداقل secret آن مدیریت‌شده و محدود باشد.

---

# 13. Enumهای مهم

```text
Role:
professor | student | admin

ProfessorStatus:
pending | approved | rejected

ProjectStatus:
open | in_progress | completed

ProjectType:
thesis | internship | course | research

ProjectVisibility:
public | private

ApplicationStatus:
pending | approved | rejected | cancelled

ApplicationSource:
student_application | owner_invite

MessageType:
text | progress_update

FileContext:
chat | document | deliverable
```
