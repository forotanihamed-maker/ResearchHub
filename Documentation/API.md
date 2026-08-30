# ResearchHub — مرجع کامل API

> همه‌ی endpointها زیر `/api/` هستند. احراز هویت با کوکی HttpOnly به‌نام `auth_token` انجام می‌شود (به‌جز `login`/`register` که خودشان این کوکی را می‌سازند). کدهای خطا: `401` = لاگین نیستی، `403` = دسترسی نداری، `404` = پیدا نشد، `409` = تعارض state، `429` = rate limit.

---

## Auth

### `POST /api/auth/register`
ثبت‌نام. نقش `professor` با `professorStatus: "pending"` ساخته می‌شود (باید توسط ادمین تأیید شود)؛ `student` بلافاصله `approved` است.

**Body:**
```json
{
  "name": "string (2-100 char)",
  "email": "string",
  "password": "string (حداقل طول در PASSWORD_MIN، در lib/validation.ts)",
  "role": "student" | "professor",
  "department": "یکی از ۶ مقدار enum دپارتمان",
  "university": "string?",
  "bio": "string?",
  "interests": "string[]?",
  "programmingLanguages": "string[]?"
}
```
**پاسخ ۲۰۱:** کاربر ساخته‌شده + ست‌شدن کوکی `auth_token`.
**خطاها:** `400` برای هر فیلد نامعتبر (پیام دقیق در `error`)، `409` اگر ایمیل تکراری باشد.

### `POST /api/auth/login`
**Body:** `{ "email": string, "password": string }`
**پاسخ ۲۰۰:** `{ "user": {...بدون فیلد password}, "token": "jwt" }` + کوکی `auth_token`.
**خطاها:**
- `401` — ایمیل/پسورد اشتباه (پیام یکسان برای «کاربر نیست» و «پسورد غلط»، عمداً برای جلوگیری از user enumeration)
- `403` — استاد `pending` یا `rejected` است
- `429` — rate limit: حداکثر ۵ تلاش/۱۵دقیقه به ازای ایمیل، ۲۰ تلاش/۱۵دقیقه به ازای IP

### `POST /api/auth/logout`
بدون body. کوکی `auth_token` را پاک می‌کند.

### `GET /api/auth/me`
پروفایل کاربر لاگین‌شده را برمی‌گرداند (بدون پسورد).

### `PATCH /api/auth/me`
ویرایش پروفایل. همه‌ی فیلدها اختیاری‌اند (فقط چیزی که بفرستید آپدیت می‌شود):
```json
{
  "name": "string?",
  "bio": "string? | null",
  "department": "string?",
  "university": "string? | null",
  "interests": "string[]?",
  "programmingLanguages": "string[]?"
}
```

---

## Projects

### `GET /api/projects`
لیست پروژه‌ها — رفتار بر اساس نقش فرق دارد:
- **استاد:** فقط پروژه‌های خودش (مگر `?chat=true`)
- **دانشجو:** فقط پروژه‌های `open` + پروژه‌هایی که خودش عضوشان است
- **ادمین:** `403` — این endpoint برای ادمین بسته است؛ ادمین باید از `/api/admin/projects` استفاده کند

**Query params:**
| پارامتر | مقدار | توضیح |
|---|---|---|
| `status` | `open` \| `in_progress` \| `completed` \| `all` | فیلتر وضعیت |
| `search` | متن آزاد | جست‌وجو در عنوان/توضیحات/نام استاد (فیلتر سمت سرور، پس از کوئری) |
| `chat` | `true` | فقط پروژه‌هایی که کاربر در `project_members` عضو آن‌هاست (برای صفحه‌ی پیام‌ها) |

**پاسخ:** `{ "projects": [{ ...فیلدهای پروژه, memberCount, pendingApplications }] }` — `memberCount` تعداد دانشجویان است، **بدون شمردن خود استاد**.

### `POST /api/projects` *(فقط استاد)*
```json
{
  "title": "string (طول مجاز در TITLE_MIN..TITLE_MAX)",
  "description": "string (DESCRIPTION_MIN..DESCRIPTION_MAX)",
  "maxMembers": "int? (پیش‌فرض ۵)",
  "deadline": "ISO date string?"
}
```
پروژه با `status: "open"` ساخته می‌شود؛ استاد به‌صورت خودکار در `project_members` عضو می‌شود.

### `GET /api/projects/[id]`
جزئیات یک پروژه + لیست اعضا + (اگر دانشجو باشی) وضعیت درخواست خودت (`myApplication`) و `isMember`.
دانشجو می‌تواند هر پروژه‌ای را ببیند؛ استاد فقط پروژه‌ی خودش را.

### `PATCH /api/projects/[id]` *(فقط استاد مالک)*
هر فیلد اختیاری است: `title`, `description`, `status`, `maxMembers`, `deadline`.
اگر `maxMembers` را کمتر از تعداد اعضای فعلی بفرستید → `409`.

### `DELETE /api/projects/[id]` *(فقط استاد مالک)*
حذف کامل پروژه (cascade روی applications/members/messages).

---

## Applications (درخواست عضویت)

### `GET /api/applications` *(فقط دانشجو)*
لیست همه‌ی درخواست‌های ارسالی خود دانشجو، با اطلاعات پروژه/استاد.

### `GET /api/projects/[id]/applications` *(فقط استاد مالک همان پروژه)*
لیست درخواست‌های یک پروژه، شامل اطلاعات کامل دانشجو (نام، ایمیل، دپارتمان، علایق، زبان‌های برنامه‌نویسی).

### `POST /api/projects/[id]/applications` *(فقط دانشجو)*
```json
{ "message": "string? (حداکثر ۲۰۰۰ کاراکتر)" }
```
شرط‌های رد درخواست: پروژه `open` نباشد (`404`)، قبلاً درخواست داده باشد (`409`)، قبلاً عضو باشد (`409`)، پروژه پر باشد (`409`).

### `PATCH /api/projects/[id]/applications/[appId]`
- **استاد مالک:** `{ "status": "approved" | "rejected" }` — فقط روی درخواست `pending`. تأیید داخل یک تراکنش با row-lock انجام می‌شود تا race condition روی ظرفیت پروژه رخ ندهد.
- **دانشجوی صاحب درخواست:** `{ "status": "cancelled" }` — فقط می‌تواند درخواست `pending` خودش را لغو کند.

---

## Dashboard

### `GET /api/dashboard/stats`
پاسخ بر اساس نقش فرق دارد:

**استاد:**
```json
{ "stats": { "totalProjects", "openProjects", "inProgressProjects", "completedProjects", "totalApplications", "pendingApplications", "totalMembers" } }
```

**دانشجو:**
```json
{ "stats": { "totalApplications", "pendingApplications", "approvedApplications", "projectsJoined", "openProjects" } }
```

---

## Chat

### `GET /api/projects/[id]/messages`
فقط اعضای پروژه. **حداکثر ۵۰ پیام آخر** (بدون pagination برای دیدن قدیمی‌تر).

### `POST /api/projects/[id]/messages`
```json
{ "content": "string (۱ تا ۲۰۰۰ کاراکتر)" }
```
Rate limit: ۲۰ پیام در دقیقه، به ازای هر (پروژه، کاربر).

---

## Health

### `GET /api/health`
`{ "ok": true }` یا `{ "ok": false }` با کد ۵۰۰ — فقط یک `select 1` روی دیتابیس.

---

## Admin *(همه‌ی این‌ها نیازمند `role: "admin"` هستند)*

### `GET /api/admin/stats`
آمار دانشجو/استاد **محدود به دپارتمان‌های تخصیص‌یافته به همین ادمین**. تعداد پروژه‌ها عمداً سراسری است (بدون فیلتر دپارتمان).

### `GET /api/admin/departments`
```json
{ "departments": [...۶ دپارتمان ممکن], "selected": [...دپارتمان‌های فعلاً تخصیص‌یافته به این ادمین] }
```

### `PATCH /api/admin/departments`
```json
{ "departments": ["دپارتمان۱", "دپارتمان۲", ...] }
```
لیست قبلی کامل جایگزین می‌شود (نه اضافه‌شدن تدریجی). حداقل یک دپارتمان الزامی است.

### `GET /api/admin/professors`
لیست اساتید **در محدوده‌ی دپارتمان‌های همین ادمین**. اگر ادمین هیچ دپارتمانی نداشته باشد → آرایه‌ی خالی (نه خطا).

### `PATCH /api/admin/professors`
```json
{ "id": number, "status": "approved" | "rejected" | "pending" }
```
فقط روی استادانی کار می‌کند که دپارتمانشان در محدوده‌ی همین ادمین باشد؛ در غیر این صورت `403`.

### `GET /api/admin/projects`
لیست همه‌ی پروژه‌های دانشگاه (سراسری، بدون فیلتر دپارتمان) — برای نظارت کلی ادمین.

### `GET|POST /api/admin/messages`
پیام‌رسانی مستقیم دوطرفه بین ادمین و اساتید هم‌دپارتمان (جدول `direct_messages`، جدا از چت پروژه).

---

## Seed / Diagnostics *(فقط پشت `SEED_SECRET`، برای محیط توسعه/پایلوت)*

### `GET /api/seed?secret=...`
اگر دیتابیس خالی باشد، داده‌ی نمونه می‌سازد؛ در غیر این صورت فقط تعداد رکوردهای موجود را گزارش می‌دهد (بدون تغییر داده).

| Query param اضافه | رفتار |
|---|---|
| `&action=clear` | پاک‌کردن کامل همه‌ی داده‌ها |
| `&action=force` | پاک‌کردن + seed مجدد کامل |
| `&action=list` | فقط-خواندنی: لیست کامل کاربران با ایمیل/نقش/وضعیت |
| `&action=check-schema` | فقط-خواندنی: بررسی وجود جداول `admin_departments`/`direct_messages` و دپارتمان‌های تخصیص‌یافته به هر ادمین |

⚠️ این route باید فقط در محیط توسعه/پایلوت فعال بماند؛ پیش از فروش واقعی به یک نهاد، باید پشت یک flag محیطی کاملاً غیرفعال یا حذف شود.
