# ResearchHub — مدل امنیتی (بازبینی بر اساس کد فعلی)

> تاریخ بازبینی: 2026-09-24
>
> این سند وضعیت واقعی مشاهده‌شده در کد ارسالی را ثبت می‌کند. «پیاده‌سازی شده» به معنی «بدون ریسک» نیست؛ محدودیت‌های شناخته‌شده نیز صریحاً ثبت شده‌اند.

# 1. خلاصه وضعیت

| حوزه | وضعیت فعلی |
|---|---|
| Password hashing | bcryptjs با cost 12 |
| JWT | پیاده‌سازی شده |
| HttpOnly cookie | بله |
| CSRF / Origin check | بله، در middleware API |
| RBAC | بله |
| Resource ownership | بله |
| Admin department scope | بله، در endpointهای مربوط |
| Rate limiting | بله، ولی in-memory |
| Request body size guard | بله |
| File size/type validation | بله |
| Audit logging | بله، stdout/JSON |
| Email verification | وجود ندارد |
| Forgot/reset password | وجود ندارد |
| Refresh token | وجود ندارد |
| Token revocation فوری | وجود ندارد |
| Automated security test suite | در کد ارسالی مشاهده نشد |
| Public Blob file access | بله؛ یک ریسک/تصمیم معماری مهم |

---

# 2. Authentication

## Password

کد از:

```text
bcryptjs
cost = 12
```

استفاده می‌کند.

Password در responseهای safe user برگردانده نمی‌شود.

## JWT

secret فقط از:

```text
process.env.JWT_SECRET
```

خوانده می‌شود.

اگر تنظیم نشده باشد fallback ثابت وجود ندارد.

Payload:

```text
userId
email
role
name
```

## Cookie

```text
httpOnly = true
secure = true in production
sameSite = lax
path = /
```

JWT stateless است.

### محدودیت

هیچ server-side session یا refresh token وجود ندارد.

بنابراین:

```text
logout
```

کوکی مرورگر را حذف می‌کند، ولی اگر JWT قبلی در جای دیگری کپی شده باشد، تا زمان انقضا از سمت server blacklist نمی‌شود.

همچنین تغییر password یا professorStatus به‌تنهایی JWT قبلی را revoke نمی‌کند.

---

# 3. Authorization

Authorization در APIها فقط به UI متکی نیست.

## Project ownership

source of truth:

```text
projects.creatorId
```

برای عملیات حساس مانند:

- update project
- delete project
- approve/reject applications
- invite
- remove member
- deliverable upload

مالکیت server-side بررسی می‌شود.

## Membership

`projectMembers` برای دسترسی به:

- project chat
- project files
- برخی جزئیات project

استفاده می‌شود.

## ID validation

Routeهای دارای ID معمولاً ابتدا مثبت و integer بودن ID را بررسی می‌کنند.

بعد از آن ownership/membership بررسی می‌شود.

---

# 4. IDOR / BOLA

الگوی دفاعی فعلی:

```text
URL id
  ↓
parse/validate
  ↓
load resource
  ↓
check owner/member/subject
  ↓
allow or deny
```

این الگو در project/application/file/message routes دیده می‌شود.

### وضعیت تست

در کد ارسالی test suite امنیتی خودکار برای IDOR/BOLA مشاهده نشد.

بنابراین برای Pilotهای بزرگ‌تر باید سناریوهای زیر به‌صورت automated test اضافه شوند:

- student A → project B
- student A → application B
- professor A → project B
- user A → file B
- user A → message B
- admin A → professor خارج از department scope

---

# 5. Admin scope

Admin فقط با role شناخته نمی‌شود؛ برای برخی عملیات department scope نیز لازم است.

منبع scope:

```text
admin_departments
```

نمونه:

```text
GET/PATCH /api/admin/professors
```

استاد فقط اگر department او در scope admin باشد قابل مشاهده/تغییر است.

اما این قانون برای همه endpointهای admin یکسان نیست.

نکته مهم:

```text
/admin/projects
```

در کد فعلی project list را سراسری برمی‌گرداند.

همچنین:

```text
/admin/stats
```

user counts را scoped ولی project count را global می‌دهد.

این تفاوت باید بخشی از threat model و policy رسمی باشد.

---

# 6. CSRF

Middleware روی:

```text
POST
PUT
PATCH
DELETE
```

اجرا می‌شود.

Source:

```text
Origin
```

و در نبود آن:

```text
Referer
```

با origin مورد انتظار ساخته‌شده از Host/protocol مقایسه می‌شود.

عدم تطابق:

```text
403
```

نکته:

اگر Origin/Referer هر دو کاملاً غایب باشند، middleware فعلی request را عبور می‌دهد.

این تصمیم برای سازگاری با curl/server-to-server/edge cases گرفته شده، اما یک hardening point بالقوه است.

---

# 7. Request size protection

Middleware:

```text
non-multipart: 100KB
multipart: 11MB
```

اما check بر اساس:

```text
Content-Length
```

است.

در نتیجه requestهای chunked که Content-Length ندارند ممکن است از این guard عبور کنند.

برای file upload، route خودش نیز:

```text
file.size <= 10MB
```

را enforce می‌کند.

---

# 8. Rate limiting

پیاده‌سازی:

```text
src/lib/rateLimit.ts
```

و state در:

```text
Map<string, Bucket>
```

است.

## Login

```text
email: 5 / 15min
IP:    20 / 15min
```

## Register

```text
IP: 5 / 15min
```

## Password change

```text
user: 5 / 15min
```

## Project chat

```text
user + project: 20 / min
```

### ریسک معماری

In-memory بودن یعنی:

```text
instance A
instance B
cold start
```

state مشترک ندارند.

بنابراین rate limiting global و قطعی نیست.

برای scale واقعی باید shared store مانند Redis/Upstash یا راهکار معادل در نظر گرفته شود.

---

# 9. File security

Validation فعلی:

- حداکثر 10MB
- extension allow-list
- MIME allow-list
- sanitize نام فایل برای path
- authorization قبل از upload

Allowed:

```text
pdf
doc
docx
zip
png
jpg
jpeg
```

## نکته مهم

Vercel Blob با:

```text
access: "public"
```

آپلود می‌شود.

بنابراین دو لایه را باید از هم جدا کرد:

```text
API authorization
≠
Blob object authorization
```

API برای metadata دسترسی را کنترل می‌کند، اما URL Blob public است.

### اثر عملیاتی

برای فایل‌های حساس پژوهشی/دانشگاهی، افشای URL می‌تواند دسترسی مستقیم به object را ممکن کند.

این یکی از مهم‌ترین مواردی است که پیش از استفاده گسترده باید تصمیم‌گیری شود:

- public URLs پذیرفته شود،
- یا storage/private access/signed URL architecture اضافه شود.

---

# 10. Seed endpoint

مسیر:

```text
/api/seed
```

توانایی عملیات destructive دارد.

بدون:

```text
SEED_SECRET
```

route عمداً `404` می‌دهد.

با secret، header یا query پذیرفته می‌شود.

### ریسک

قرار دادن secret در query string:

```text
?secret=...
```

از نظر عملیاتی مناسب نیست، چون query string ممکن است در log/history/observability دیده شود.

روش ترجیحی برای عملیات عملیاتی:

```text
x-seed-secret
```

و مهم‌تر از آن:

> بعد از seed اولیه، endpoint در production غیرفعال یا حذف شود.

---

# 11. Audit logging

Audit eventهای مشاهده‌شده شامل مواردی مانند:

```text
login_success
login_failed
login_rate_limited
professor_pending_login
professor_rejected_login
register_success
register_rate_limited
seed_denied
seed_executed
project_deleted
application_approved
application_rejected
professor_created
professor_status_changed
project_file_uploaded
project_file_deleted
message_edited
message_deleted
password_change_rate_limited
password_change_failed
password_changed
```

خروجی:

```text
stdout
JSON structured log
```

### محدودیت

این سیستم:

- tamper-proof نیست
- retention مستقل ندارد
- compliance-grade audit store نیست

برای Pilot ممکن است کافی باشد، اما برای نیازهای رسمی باید log storage مستقل/immutable تعریف شود.

---

# 12. Missing security controls

در کد فعلی موارد زیر مشاهده نشد:

## Email verification

هر کاربر می‌تواند با email واردشده ثبت‌نام کند؛ verification flow وجود ندارد.

## Password reset

Forgot password / reset token flow وجود ندارد.

## Refresh tokens

وجود ندارد.

## Session revocation

وجود ندارد.

## Automated security tests

در archive ارسالی test suite امنیتی مستقل مشاهده نشد.

---

# 13. Threat priorities

برای ادامه‌ی hardening، موارد زیر باید به‌ترتیب بررسی عملیاتی شوند:

### A — فایل‌های public

تصمیم‌گیری درباره public Blob URLs و در صورت نیاز مهاجرت به private/signed access.

### B — rate limiting توزیع‌شده

جایگزینی in-memory limiter با shared store.

### C — automated authorization tests

پوشش IDOR/BOLA و admin scope.

### D — session lifecycle

در صورت نیاز business:

- refresh token
- session registry
- revocation

### E — account lifecycle

در صورت نیاز:

- email verification
- password reset

### F — audit durability

انتقال audit log از stdout-only به storage با retention و access policy مشخص.

---

# 14. Security verification checklist

برای هر release:

```text
[ ] login student
[ ] login approved professor
[ ] pending professor denied
[ ] rejected professor denied
[ ] invalid password denied
[ ] rate limit login
[ ] CSRF cross-origin mutation denied
[ ] project ownership checked
[ ] application ownership checked
[ ] invitation ownership checked
[ ] file ownership checked
[ ] message ownership checked
[ ] admin department scope checked
[ ] file >10MB rejected
[ ] invalid MIME/extension rejected
[ ] seed disabled without secret
[ ] health endpoint works
[ ] audit events visible in logs
```

برای production releaseهای مهم، نتیجه هر مورد باید ثبت شود.

---

# 15. Operational safety rules

هیچ‌یک از موارد زیر بدون تأیید انسانی و برنامه rollback انجام نشود:

- `clear` یا `force` seed
- حذف/بازسازی migration
- حذف production data
- تغییر JWT secret
- تغییر database credentials
- تغییر storage access
- migrationهای destructive
- rotation secrets بدون برنامه برای active sessions

قبل از تغییر:

```text
What?
Why?
Risk?
Backup?
Rollback?
Verification?
Approval?
```
