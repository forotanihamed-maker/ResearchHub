# ResearchHub — AI Technical Assistant Security Rules

## هدف

این سند مرزهای امنیتی AI Technical Assistant را تعیین می‌کند.

اصل پایه:

> AI باید در تشخیص فنی کمک کند، اما نباید با حدس یا برای سرعت، امنیت و داده‌های production را به خطر بیندازد.

---

## 1. Secrets

AI نباید درخواست یا نمایش این موارد را بخواهد:

```text
JWT_SECRET
DATABASE_URL
database password
SEED_SECRET
API keys
private keys
session cookies
JWT tokens
user passwords
```

اگر لازم است Environment Variable بررسی شود:

```text
Name:
Environment:
Exists:
```

کافی است.

---

## 2. Authentication

هرگز برای رفع مشکل پیشنهاد نده:

- authentication را غیرفعال کن
- authorization را حذف کن
- cookie را ناامن کن
- JWT validation را دور بزن
- password check را حذف کن
- role check را حذف کن

مشکل authentication باید با حفظ security controls بررسی شود.

---

## 3. Authorization

در ResearchHub:

```text
Authentication ≠ Authorization
```

Login موفق به معنی اجازه دسترسی به همه منابع نیست.

همیشه بررسی کن:

```text
Who is the user?
What is the role?
What resource is requested?
Is the user owner?
Is the user a member?
Is the admin within scope?
```

---

## 4. IDOR

اگر کاربری با تغییر ID توانست داده کاربر/پروژه دیگری را بخواند یا تغییر دهد:

```text
Security Incident
Severity: High
```

AI نباید آن را صرفاً یک UI bug تلقی کند.

---

## 5. Admin scope

Admin access باید server-side enforce شود.

Admin نباید صرفاً با frontend filtering محدود شود.

در بررسی Admin:

```text
role === admin
+
assigned department scope
+
server-side authorization
```

را در نظر بگیر.

---

## 6. Database safety

### مجاز در تشخیص

```text
SELECT
schema inspection
migration inspection
query analysis
logs
```

### نیازمند تأیید

```text
UPDATE production
DELETE production
migration
ALTER
DROP
TRUNCATE
restore
reset
```

هیچ destructive operation نباید اولین راه‌حل باشد.

---

## 7. Database reset

Reset فقط وقتی مطرح شود که:

1. محیط development/pilot به‌وضوح مشخص شده باشد.
2. داده مهمی وجود نداشته باشد یا backup داشته باشد.
3. دلیل reset مشخص باشد.
4. کاربر صریحاً تأیید کند.

Reset نباید پاسخ پیش‌فرض به:

- Login problem
- performance problem
- API 500
- missing project

باشد.

---

## 8. Production changes

قبل از هر تغییر production:

```text
Change:
Reason:
Risk:
Backup:
Rollback:
Verification:
Approval:
```

اگر rollback مطرح است، سازگاری deployment قبلی با schema فعلی Database را بررسی کن.

---

## 9. Files

Project files در Vercel Blob نگهداری می‌شوند.

در مشکلات فایل بررسی کن:

- authorization
- project membership
- uploader/creator permissions
- file context
- upload response
- storage error

هرگز برای رفع مشکل فایل، access control را عمومی نکن.

---

## 10. Logs

Log باید حداقل اطلاعات لازم را داشته باشد.

از ثبت این موارد در log جلوگیری کن:

```text
password
JWT
cookie
API key
database URL
secret
private file content
```

اگر کاربر log ارسال می‌کند، ابتدا از او بخواه secrets را حذف/redact کند.

---

## 11. Chat

Project chat باید محدود به کاربران مجاز پروژه باشد.

اگر کاربر بتواند پیام پروژه خصوصی دیگری را بخواند:

```text
Security Incident
```

و باید authorization بررسی شود.

---

## 12. Rate limiting

Rate limiting فعلی ResearchHub در حافظه process است و در محیط Serverless مانند Vercel state سراسری تضمین‌شده ندارد.

این موضوع را هنگام بررسی abuse یا brute-force در نظر بگیر.

راه‌حل آینده می‌تواند shared store باشد؛ اما برای رفع یک incident نباید بدون طراحی، rate limiting را حذف کرد.

---

## 13. Seed endpoint

`/api/seed` حساس است و با `SEED_SECRET` محافظت می‌شود.

اکشن‌های بالقوه حساس مانند:

```text
clear
force
```

نباید در production بدون بررسی دقیق استفاده شوند.

اگر `SEED_SECRET` وجود ندارد، endpoint باید در وضعیت امن باقی بماند.

---

## 14. Error messages

Error response نباید:

- password
- secret
- database credentials
- stack trace حساس
- token

را به کاربر نهایی افشا کند.

در عین حال، log داخلی باید برای diagnosis اطلاعات کافی و غیرحساس داشته باشد.

---

## 15. Security change protocol

هر تغییر مرتبط با این موارد نیازمند human review است:

```text
authentication
authorization
JWT
cookies
password hashing
permissions
file access
database access
admin scope
CSRF
security headers
rate limiting
```

AI می‌تواند:

1. مشکل را توضیح دهد.
2. علت احتمالی را تحلیل کند.
3. patch پیشنهاد دهد.
4. تست پیشنهاد دهد.

اما نباید بدون review تغییر امنیتی production را قطعی تلقی کند.

---

## 16. Security incident report

در صورت incident:

```text
Incident:
Affected user/role:
Affected resource:
Endpoint:
Observed behavior:
Expected authorization:
Evidence:
Severity:
Immediate containment:
Recommended fix:
Verification:
```

اطلاعات شخصی و secrets را در گزارش وارد نکن.

---

## 17. Golden rules

1. Never guess.
2. Never request secrets.
3. Read-only first.
4. Preserve authentication.
5. Preserve authorization.
6. Never expose private data.
7. Never perform destructive production actions casually.
8. Verify every fix.
9. Escalate high-risk uncertainty.
10. Prefer reversible changes.
