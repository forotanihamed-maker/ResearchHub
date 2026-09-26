# ResearchHub — Troubleshooting Procedure

## هدف

این سند روش عمومی عیب‌یابی AI Technical Assistant را تعریف می‌کند.

Playbookهای اختصاصی مانند Login، Project، Database و Vercel بعد از این فرآیند استفاده می‌شوند.

---

## 1. Incident Intake

وقتی اپراتور فقط می‌گوید:

> «یک مشکلی در سیستم هست»

ابتدا این موارد را مشخص کن:

```text
What is broken?
Who is affected?
When did it start?
What should happen?
What actually happens?
Does it affect one user, several users, or everyone?
```

اطلاعات را به حداقل لازم محدود کن.

---

## 2. Classify the incident

مشکل را در یکی از این گروه‌ها قرار بده:

```text
AUTHENTICATION
AUTHORIZATION
PROJECT
APPLICATION
INVITATION
MEMBERSHIP
CHAT
FILE
DATABASE
DEPLOYMENT
PERFORMANCE
SECURITY
OTHER
```

اگر چند گروه محتمل است، ابتدا محتمل‌ترین و کم‌خطرترین مسیر را بررسی کن.

---

## 3. Determine scope

### One user

احتمالاً:

- account state
- role
- permission
- user-specific data
- browser/session

### Several users

احتمالاً:

- feature/API
- shared data
- deployment
- database
- permissions

### Entire system

احتمالاً:

- deployment
- infrastructure
- database
- DNS
- major configuration

---

## 4. Timeline

مشخص کن:

- چه زمانی شروع شد؟
- آیا قبل از آن deployment انجام شده؟
- آیا configuration تغییر کرده؟
- آیا migration انجام شده؟
- آیا فقط production مشکل دارد؟

زمان تقریبی برای correlation با Vercel logs مهم است.

---

## 5. Symptom → Evidence

هرگز از symptom مستقیماً به fix نرو.

مثال:

```text
Symptom:
Login fails

↓
Evidence:
POST /api/auth/login → 500

↓
Evidence:
Vercel runtime log → database connection timeout

↓
Diagnosis:
Database connectivity issue
```

---

## 6. HTTP decision tree

### 2xx

درخواست از نظر HTTP موفق است؛ اگر رفتار غلط است، response/data/frontend را بررسی کن.

### 400

احتمال validation یا request format.

### 401

احتمال authentication/credentials.

### 403

احتمال authorization/role/scope.

### 404

بررسی route، resource ID و وجود resource.

### 409

احتمال conflict، duplicate یا state conflict.

### 429

Rate limiting.

### 500

Backend/runtime/database/configuration را با log بررسی کن.

### 502/503/504

Infrastructure/upstream/database/network/deployment را بررسی کن.

---

## 7. Frontend vs API vs Database

از این مسیر استفاده کن:

```text
User action
   ↓
Browser UI
   ↓
Network request
   ↓
API response
   ↓
Backend logic
   ↓
Database / external service
```

اولین نقطه‌ای که رفتار از expected خارج می‌شود، مرز اصلی بررسی است.

---

## 8. Read-only first

در تشخیص اولیه:

```text
Logs
Source
Network
SELECT
Deployment metadata
```

مجاز و ترجیحی هستند.

تغییر داده، migration، reset و restore مرحله تشخیص اولیه نیستند.

---

## 9. Hypothesis management

برای هر hypothesis بنویس:

```text
Hypothesis:
Evidence supporting:
Evidence against:
Next test:
```

اگر یک تست hypothesis را رد کرد، آن را کنار بگذار.

---

## 10. Avoid shotgun debugging

این کار ممنوع است:

```text
change database
change JWT
change React Query
redeploy
reset database
```

همه به‌صورت هم‌زمان.

چون بعداً نمی‌دانیم کدام تغییر اثر کرده و ممکن است مشکل جدید ایجاد شود.

---

## 11. Regression

اگر مشکل بعد از تغییر شروع شده:

```text
Last known good
        ↓
New deployment/change
        ↓
Diff
        ↓
Test
```

اگر rollback مطرح است، ابتدا compatibility با Database را بررسی کن.

---

## 12. Severity

### Critical
کل سامانه یا Database unavailable، یا احتمال compromise امنیتی.

### High
قابلیت اصلی برای تعداد زیادی از کاربران خراب است، یا data/security impact محتمل است.

### Medium
یک قابلیت یا گروه محدود دچار مشکل است و workaround وجود دارد.

### Low
مشکل ظاهری/جزئی با workaround.

---

## 13. Stop conditions

AI باید متوقف و escalate کند اگر:

- داده production احتمالاً خراب شده
- migration خطرناک لازم است
- restore لازم است
- secret compromise محتمل است
- security vulnerability تأیید شده
- علت outage گسترده مشخص نیست
- اقدام بعدی irreversible است

---

## 14. Incident closure

Incident فقط وقتی بسته شود که:

1. root cause یا علت قابل‌قبول مشخص شده باشد.
2. fix یا mitigation اعمال شده باشد.
3. رفتار اصلی verify شده باشد.
4. اثر جانبی بررسی شده باشد.
5. در صورت اهمیت، incident report ثبت شده باشد.

---

## 15. Final report

```text
Incident:
Date/time:
Scope:
Affected users:
Affected feature:
Root cause:
Evidence:
Fix:
Verification:
Preventive action:
Follow-up:
```
