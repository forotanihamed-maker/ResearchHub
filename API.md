# ResearchHub — مرجع API (به‌روز)

> این سند بر اساس endpointهای موجود در `src/app/api` تهیه شده است. مسیر پایه همه APIها `/api` است.
>
> **احراز هویت:** به‌طور معمول با کوکی HttpOnly به نام `auth_token` انجام می‌شود. `login` و ثبت‌نام دانشجو این کوکی را ایجاد می‌کنند؛ ثبت‌نام استاد تا زمان تأیید ادمین اجازه ورود نمی‌دهد.
>
> **کدهای رایج:** `400` درخواست نامعتبر، `401` احراز هویت نشده، `403` عدم دسترسی، `404` منبع پیدا نشد، `409` تعارض وضعیت/ظرفیت، `429` محدودیت نرخ، `500` خطای داخلی.

---

## 1. Authentication

### `POST /api/auth/register`
ثبت‌نام دانشجو یا استاد.

**Body:**
```json
{
  "name": "string (2..100)",
  "email": "string (حداکثر 255، معتبر)",
  "password": "string (8..72)",
  "role": "student" | "professor",
  "department": "یکی از ۶ گروه آموزشی",
  "university": "string? (حداکثر 255)",
  "bio": "string? (حداکثر 1000)",
  "interests": "string[]?",
  "programmingLanguages": "string[]?"
}
```

- اگر `role` برابر `professor` باشد، حساب با `professorStatus: "pending"` ساخته می‌شود و **توکن ورود صادر نمی‌شود**؛ پس از تأیید ادمین امکان ورود دارد.
- اگر `role` برابر `student` باشد، حساب `approved` است و پاسخ شامل `token` شده و کوکی `auth_token` تنظیم می‌شود.
- `POST` روی این route دارای rate limit بر اساس IP است: حداکثر ۵ تلاش در ۱۵ دقیقه.
- `409` در صورت تکراری بودن ایمیل.
- پاسخ موفق دانشجو: `201 { user, token }`
- پاسخ موفق استاد: `201 { user, pendingApproval: true, message }`

**گروه‌های آموزشی فعلی:**
- مهندسی نرم‌افزار
- هوش مصنوعی
- شبکه‌های کامپیوتری
- معماری سیستم‌های کامپیوتری
- امنیت اطلاعات
- علوم داده

### `POST /api/auth/login`
```json
{
  "email": "string",
  "password": "string"
}
```

پاسخ موفق `200`:
```json
{ "user": { "...": "..." }, "token": "jwt" }
```

- اطلاعات password در `user` برگردانده نمی‌شود.
- کوکی `auth_token` تنظیم می‌شود.
- `401` برای اعتبارنامه نامعتبر.
- `403` برای استاد `pending` یا `rejected`.
- rate limit: حداکثر ۵ تلاش در ۱۵ دقیقه برای هر ایمیل و ۲۰ تلاش در ۱۵ دقیقه برای هر IP.

### `POST /api/auth/logout`
بدون body. کوکی `auth_token` حذف می‌شود.

### `GET /api/auth/me`
پروفایل کاربر فعلی را برمی‌گرداند:
```json
{ "user": { "id", "name", "email", "role", "professorStatus", "avatar", "bio", "department", "university", "interests", "programmingLanguages", "username", "createdAt" } }
```

### `PATCH /api/auth/me`
همه فیلدها اختیاری‌اند و فقط فیلد ارسال‌شده تغییر می‌کند:
```json
{
  "name": "string?",
  "bio": "string? | null",
  "department": "string?",
  "university": "string? | null",
  "username": "string? | null",
  "interests": "string[]?",
  "programmingLanguages": "string[]?"
}
```

`username` باید فقط شامل حروف انگلیسی، عدد و `_` و بین ۳ تا ۳۰ کاراکتر باشد؛ نام کاربری تکراری `409` می‌دهد.

### `PATCH /api/auth/password`
تغییر رمز عبور با تأیید رمز فعلی:
```json
{
  "currentPassword": "string",
  "newPassword": "string (8..72)"
}
```

- رمز جدید باید با رمز فعلی متفاوت باشد.
- رمز فعلی نادرست: `401`.
- کاربر فعلی پیدا نشود: `404`.
- حداکثر ۵ تلاش در ۱۵ دقیقه برای هر کاربر؛ در صورت rate limit پاسخ `429` و header `Retry-After` برمی‌گردد.

---

## 2. Projects

### `GET /api/projects`
لیست پروژه‌ها. کاربر باید وارد حساب باشد؛ ادمین باید از endpoint مدیریتی استفاده کند.

**Query params:**

| پارامتر | مقدار | توضیح |
|---|---|---|
| `status` | `open` / `in_progress` / `completed` / `all` | فیلتر وضعیت |
| `search` | متن آزاد | جست‌وجو در عنوان، توضیحات و نام سازنده/استاد، سمت سرور |
| `chat` | `true` | فقط پروژه‌هایی که کاربر عضو آن‌هاست |
| `my` | `true` | فقط پروژه‌هایی که کاربر سازنده آن‌هاست |

**دسترسی پیش‌فرض:**
- دانشجو: پروژه‌های عمومی و `open` + پروژه‌هایی که خودش عضو آن‌هاست.
- استاد: پروژه‌هایی که خودش سازنده آن‌هاست.
- `my=true` برای هر دانشجو/استاد، پروژه‌های ساخته‌شده توسط همان کاربر را برمی‌گرداند.
- `chat=true` پروژه‌های عضو‌شده توسط کاربر را برمی‌گرداند.
- ادمین: `403`.

**پاسخ:**
```json
{
  "projects": [
    {
      "id": 1,
      "title": "...",
      "description": "...",
      "status": "open",
      "type": "research",
      "creatorId": 10,
      "creatorRole": "professor",
      "visibility": "public",
      "professorId": 10,
      "maxMembers": 5,
      "deadline": "2026-10-15T00:00:00.000Z",
      "createdAt": "...",
      "updatedAt": "...",
      "professorName": "...",
      "professorDepartment": "...",
      "professorUniversity": "...",
      "memberCount": 2,
      "pendingApplications": 1
    }
  ]
}
```

`memberCount` فقط اعضای غیرسازنده را می‌شمارد و `pendingApplications` تعداد درخواست‌های `pending` است.

### `POST /api/projects`
**دانشجو و استاد** می‌توانند پروژه بسازند.

```json
{
  "title": "string (3..255)",
  "description": "string (10..5000)",
  "type": "thesis" | "internship" | "course" | "research",
  "visibility": "public" | "private",
  "maxMembers": "integer (1..50)",
  "deadline": "ISO date string? | null | \"\""
}
```

پیش‌فرض‌ها:
- استاد: `type = research`
- دانشجو: `type = course`
- `visibility = public`
- `maxMembers = 5`
- پروژه با وضعیت `open` ساخته می‌شود.
- سازنده به‌صورت خودکار عضو پروژه می‌شود.
- پروژه private یک `inviteToken` تولید می‌کند.

پاسخ `201`: `{ "project": {...} }`

### `GET /api/projects/[id]`
جزئیات پروژه، اعضا و وضعیت ارتباط کاربر فعلی با پروژه.

برای پروژه private فقط سازنده یا عضو پروژه می‌تواند آن را مشاهده کند؛ برای سایر کاربران `404` برگردانده می‌شود.

**خروجی:**
```json
{
  "project": {
    "id": 1,
    "title": "...",
    "description": "...",
    "status": "open",
    "type": "research",
    "creatorId": 10,
    "creatorRole": "professor",
    "visibility": "private",
    "inviteToken": "...",
    "professorId": 10,
    "maxMembers": 5,
    "deadline": "...",
    "createdAt": "...",
    "updatedAt": "...",
    "professorName": "...",
    "professorDepartment": "...",
    "professorUniversity": "...",
    "professorAvatar": "...",
    "members": [],
    "memberCount": 2,
    "myApplication": null,
    "isMember": true,
    "isOwner": false,
    "inviteLink": "/invite/<token>"
  }
}
```

### `PATCH /api/projects/[id]`
فقط سازنده پروژه.

تمام فیلدهای زیر اختیاری‌اند:
```json
{
  "title": "string",
  "description": "string",
  "status": "open" | "in_progress" | "completed",
  "type": "thesis" | "internship" | "course" | "research",
  "visibility": "public" | "private",
  "maxMembers": "integer (1..50)",
  "deadline": "ISO date string | null | \"\"",
  "regenerateInviteToken": true,
  "revokeInviteToken": true
}
```

- تغییر private/public به‌صورت خودکار token را ایجاد/حذف می‌کند.
- `regenerateInviteToken=true` توکن جدید می‌سازد.
- `revokeInviteToken=true` توکن را باطل می‌کند.
- کاهش `maxMembers` به کمتر از تعداد اعضای فعلی `409` است.

### `DELETE /api/projects/[id]`
فقط سازنده پروژه. پروژه حذف می‌شود و روابط وابسته طبق cascade دیتابیس حذف خواهند شد.

---

## 3. Applications — درخواست عضویت

### `GET /api/applications`
فقط دانشجو. فقط درخواست‌هایی را برمی‌گرداند که منبع آن‌ها `student_application` است.

```json
{
  "applications": [
    {
      "id": 1,
      "projectId": 10,
      "studentId": 20,
      "status": "pending",
      "source": "student_application",
      "message": "...",
      "createdAt": "...",
      "updatedAt": "...",
      "projectTitle": "...",
      "projectDescription": "...",
      "projectStatus": "open",
      "professorName": "...",
      "professorDepartment": "..."
    }
  ]
}
```

### `GET /api/projects/[id]/applications`
فقط سازنده پروژه. فهرست درخواست‌های پروژه را همراه با اطلاعات دانشجو برمی‌گرداند.

### `POST /api/projects/[id]/applications`
فقط دانشجو.
```json
{ "message": "string? (حداکثر 2000 کاراکتر)" }
```

شرایط معمول خطا:
- پروژه پیدا نشود: `404`
- پروژه `open` نباشد: `404`
- قبلاً عضو باشد: `409`
- درخواست در انتظار قبلی وجود داشته باشد: `409`
- ظرفیت پروژه پر باشد: `409`

پاسخ موفق `201`: `{ "application": {...} }`

### `PATCH /api/projects/[id]/applications/[appId]`
دو حالت دارد:

**استاد سازنده پروژه:**
```json
{ "status": "approved" | "rejected" }
```

**دانشجوی صاحب درخواست:**
```json
{ "status": "cancelled" }
```

فقط درخواست `pending` قابل تغییر است. تأیید درخواست در تراکنش و با row lock روی پروژه انجام می‌شود تا race condition ظرفیت رخ ندهد.

---

## 4. Invitations — دعوت مستقیم سازنده به دانشجو

### `POST /api/projects/[id]/invite`
فقط سازنده پروژه می‌تواند دانشجو را دعوت کند.

```json
{ "username": "string (3..30)" }
```

- فقط کاربر با role `student` قابل دعوت است.
- دعوت تکراری یا وجود درخواست pending قبلی: `409`.
- پروژه پر: `409`.
- پاسخ موفق `201`:
```json
{
  "application": { "...": "...", "source": "owner_invite" },
  "message": "..."
}
```

### `GET /api/invitations`
کاربر واردشده، دعوت‌های دریافتی خود را می‌گیرد. فقط رکوردهایی با `source = owner_invite` برگردانده می‌شوند.

```json
{ "invitations": [ { "id", "projectId", "status", "createdAt", "projectTitle", "creatorName" } ] }
```

### `PATCH /api/invitations/[id]`
فقط دانشجوی صاحب دعوت.
```json
{ "status": "approved" | "rejected" }
```

- رد دعوت: وضعیت `rejected`.
- قبول دعوت: دانشجو به پروژه اضافه می‌شود و در صورت پر نبودن ظرفیت، دعوت `approved` می‌شود.
- در صورت پذیرش موفق پروژه `open` به `in_progress` تبدیل می‌شود.
- ظرفیت پر: `409`.

### `POST /api/invites/[token]`
پیوستن مستقیم دانشجو از طریق لینک دعوت private.

بدون body. token از مسیر URL گرفته می‌شود.

- فقط دانشجو.
- token باید معتبر و مربوط به پروژه `private` باشد.
- اگر کاربر قبلاً عضو باشد، پیام موفقیت و `projectId` برمی‌گردد.
- ظرفیت پر: `409`.
- در صورت موفقیت، دانشجو عضو پروژه می‌شود و اگر پروژه `open` باشد به `in_progress` تغییر می‌کند.

---

## 5. Project Members

### `DELETE /api/projects/[id]/members/[userId]`
فقط سازنده پروژه می‌تواند عضو دیگری را حذف کند.

- سازنده خودش قابل حذف نیست.
- اگر پروژه یا شناسه‌ها نامعتبر باشند، `400/404`.
- عدم دسترسی: `403`.
- پاسخ موفق:
```json
{ "message": "عضو از پروژه حذف شد" }
```

---

## 6. Project Chat

### `GET /api/projects/[id]/messages`
فقط اعضای پروژه یا سازنده.

حداکثر **۵۰ پیام آخر** برگردانده می‌شود و خروجی به ترتیب زمانی صعودی برای نمایش UI مرتب می‌شود.

هر پیام شامل فیلدهای اصلی پیام و اطلاعات فرستنده است و در صورت وجود فایل متصل:
```json
{
  "attachment": {
    "id": 1,
    "fileName": "report.pdf",
    "fileUrl": "...",
    "fileSize": 12345
  }
}
```

اگر فایل نداشته باشد `attachment: null` است.

### `POST /api/projects/[id]/messages`
فقط عضو پروژه.
```json
{
  "content": "string (1..2000)",
  "type": "text" | "progress_update"
}
```

اگر `type` مقدار دیگری باشد، route آن را به `text` تبدیل می‌کند.

rate limit: حداکثر ۲۰ پیام در دقیقه برای هر `(project, user)`؛ در صورت عبور `429` با `Retry-After: 60`.

پاسخ `201` شامل `message` به همراه `senderName`, `senderAvatar`, `senderRole` و `attachment: null` است.

---

## 7. Project Files

### `GET /api/projects/[id]/files`
فقط اعضای پروژه.

**Query param اختیاری:**
- `context=chat`
- `context=document`
- `context=deliverable`

بدون `context` همه فایل‌های پروژه برگردانده می‌شوند؛ مرتب‌سازی از جدیدترین به قدیمی‌ترین است.

پاسخ:
```json
{
  "files": [
    {
      "id": 1,
      "projectId": 10,
      "uploaderId": 20,
      "fileName": "report.pdf",
      "fileUrl": "https://...",
      "fileSize": 123456,
      "context": "document",
      "chatMessageId": null,
      "createdAt": "...",
      "uploaderName": "..."
    }
  ]
}
```

### `POST /api/projects/[id]/files`
ارسال فایل با `multipart/form-data`، نه JSON.

**فیلدهای form-data:**
- `file`: فایل الزامی
- `context`: یکی از `chat`, `document`, `deliverable`
- `chatMessageId`: شناسه پیام چت، فقط در صورت نیاز برای اتصال فایل به پیام

**محدودیت فایل:** حداکثر ۱۰MB.

**پسوند/MIME مجاز:**
- PDF: `pdf`
- Word: `doc`, `docx`
- ZIP: `zip`
- تصویر: `png`, `jpg`, `jpeg`

- فقط اعضای پروژه می‌توانند upload کنند.
- `deliverable` فقط توسط سازنده پروژه قابل upload است و پروژه باید `completed` باشد؛ در غیر این صورت `403/409`.
- فایل در Vercel Blob ذخیره و metadata آن در دیتابیس ثبت می‌شود.
- نبودن `BLOB_READ_WRITE_TOKEN`: `500`.
- پاسخ موفق `201`: `{ "file": {...} }`

### `DELETE /api/projects/[id]/files/[fileId]`
فقط **آپلودکننده فایل یا سازنده پروژه**.

ابتدا object از Blob حذف می‌شود (خطای حذف Blob مانع حذف رکورد دیتابیس نمی‌شود) و سپس رکورد فایل حذف می‌شود.

پاسخ موفق:
```json
{ "message": "Deleted successfully" }
```

---

## 8. Dashboard

### `GET /api/dashboard/stats`
آمار بر اساس نقش.

**استاد:**
```json
{
  "stats": {
    "totalProjects": 0,
    "openProjects": 0,
    "inProgressProjects": 0,
    "completedProjects": 0,
    "totalApplications": 0,
    "pendingApplications": 0,
    "totalMembers": 0
  }
}
```

`totalMembers` فقط دانشجویان عضو پروژه‌های استاد است و membership خود استادها را نمی‌شمارد.

**دانشجو:**
```json
{
  "stats": {
    "totalApplications": 0,
    "pendingApplications": 0,
    "approvedApplications": 0,
    "projectsJoined": 0,
    "openProjects": 0
  }
}
```

ادمین نیز از مسیر موجود احراز هویت می‌شود، اما این route برای داشبورد تخصصی admin طراحی نشده است.

---

## 9. Admin

تمام endpointهای این بخش به `role: admin` نیاز دارند، مگر `/api/admin/messages` که استاد را نیز می‌پذیرد.

### `GET /api/admin/stats`
خروجی:
```json
{
  "students": 10,
  "professors": 5,
  "projects": 20,
  "departments": ["...", "..."]
}
```

- تعداد دانشجو و استاد فقط در دپارتمان‌های تخصیص‌یافته به همین ادمین است.
- تعداد پروژه‌ها عمداً سراسری و دانشگاهی است.
- اگر ادمین هیچ دپارتمانی نداشته باشد، هر سه count صفر و `departments: []` برگردانده می‌شود.

### `GET /api/admin/departments`
```json
{
  "departments": ["۶ دپارتمان ممکن"],
  "selected": ["دپارتمان‌های تخصیص‌یافته"]
}
```

### `PATCH /api/admin/departments`
```json
{ "departments": ["دپارتمان۱", "دپارتمان۲"] }
```

لیست قبلی کامل جایگزین می‌شود. حداقل یک دپارتمان معتبر الزامی است.

### `GET /api/admin/professors`
فهرست استادان در محدوده دپارتمان‌های همین ادمین:
```json
{
  "professors": [
    {
      "id": 1,
      "name": "...",
      "email": "...",
      "department": "...",
      "professorStatus": "pending",
      "createdAt": "..."
    }
  ]
}
```

اگر ادمین هیچ دپارتمانی نداشته باشد، `professors: []` برگردانده می‌شود.

### `POST /api/admin/professors`
عمداً غیرفعال است و همیشه `403` برمی‌گرداند؛ استاد باید خودش ثبت‌نام کند و ادمین فقط وضعیت او را تغییر دهد.

### `PATCH /api/admin/professors`
```json
{
  "id": 123,
  "status": "approved" | "rejected" | "pending"
}
```

فقط استادانی که دپارتمانشان در محدوده ادمین است قابل تغییر هستند؛ سایر موارد `403`.

### `GET /api/admin/projects`
فهرست همه پروژه‌ها برای نظارت ادمین، **بدون فیلتر دپارتمان**.

هر پروژه شامل اطلاعاتی مانند عنوان، توضیحات، وضعیت، ظرفیت، deadline، نام/ایمیل/دپارتمان سازنده، `memberCount` و `pendingApplications` است.

### `GET /api/admin/messages`
این endpoint برای **ادمین و استاد** است.

ادمین بدون `professorId` فهرست استادان مجاز را می‌گیرد:
```json
{ "professors": [...], "messages": [] }
```

ادمین با `?professorId=<id>` پیام‌های دوطرفه با استاد منتخب را نیز می‌گیرد.

استاد، بدون `professorId` فهرست مدیرانی را می‌گیرد که در دپارتمان او scope دارند؛ با `professorId` پیام‌های انتخاب‌شده برگردانده می‌شوند.

### `POST /api/admin/messages`
برای ادمین یا استاد:
```json
{
  "recipientId": 123,
  "content": "string (1..2000)"
}
```

- ادمین فقط به استادان دپارتمان‌های خودش پیام می‌دهد.
- استاد فقط به ادمینی پیام می‌دهد که دپارتمان استاد را در scope خود دارد.
- دانشجو دسترسی ندارد.
- پاسخ موفق `201`: `{ "message": {...} }`.

---

## 10. Health

### `GET /api/health`
برای بررسی سلامت سرویس و اتصال دیتابیس.

موفق:
```json
{ "ok": true }
```

در خطای دیتابیس:
```json
{ "ok": false }
```
با status `500`.

---

## 11. Seed / Diagnostics

### `GET /api/seed`
### `POST /api/seed`
این route فقط در صورت تنظیم `SEED_SECRET` فعال است. secret را می‌توان از header زیر یا query string فرستاد:

```text
x-seed-secret: <SEED_SECRET>
```
یا:
```text
/api/seed?secret=<SEED_SECRET>
```

اگر secret تنظیم نشده یا اشتباه باشد، route عمداً `404` برمی‌گرداند.

**Actionهای GET:**

| action | رفتار |
|---|---|
| بدون action | اگر DB خالی باشد seed می‌کند؛ در غیر این صورت فقط وضعیت/تعداد رکوردها را گزارش می‌کند |
| `clear` | پاک‌کردن کامل داده‌ها |
| `force` | پاک‌کردن و seed مجدد |
| `list` | نمایش فقط‌خواندنی کاربران تستی/موجود |
| `check-schema` | بررسی جداول و تخصیص دپارتمان‌های ادمین |

این route توانایی حذف/بازسازی کل دیتابیس را دارد و باید در محیط production واقعی غیرفعال یا حذف شود.

---

## 12. Project Type / Status / Visibility Reference

### Status
```text
open
in_progress
completed
```

### Type
```text
thesis       → پایان‌نامه
internship   → کارآموزی
course       → پروژه‌ی درسی
research     → پژوهشی
```

### Visibility
```text
public
private
```

### File Context
```text
chat
document
deliverable
```

---

## 13. نکات یکپارچه‌سازی Frontend

1. برای درخواست‌های authenticated، cookie `auth_token` باید همراه request ارسال شود؛ در همان origin مرورگر این cookie به‌صورت معمول خودکار ارسال می‌شود.
2. endpoint فایل‌ها `multipart/form-data` می‌خواهد و نباید body آن JSON باشد.
3. پروژه private فقط با membership/ownership قابل مشاهده است؛ داشتن `inviteToken` برای مشاهده عمومی کافی نیست.
4. برای پذیرش application یا invitation، frontend باید آماده دریافت `409` در صورت پرشدن ظرفیت باشد.
5. پیام چت حداکثر ۲۰۰۰ کاراکتر و ۲۰ پیام در دقیقه برای هر کاربر/پروژه دارد.
6. `GET /api/projects` دیگر فقط برای استادان نیست؛ دانشجو نیز می‌تواند پروژه بسازد و پروژه‌های عمومی باز را مشاهده کند.
7. `GET /api/projects?my=true` و `GET /api/projects?chat=true` فیلترهای اختصاصی فعلی هستند و باید در مستندات/کلاینت لحاظ شوند.
