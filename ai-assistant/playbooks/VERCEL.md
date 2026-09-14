# ResearchHub --- VERCEL Playbook

## هدف

عیب‌یابی deployment، build، runtime، environment variables و production
incidents.

## معماری واقعی

ResearchHub روی Vercel deploy می‌شود و APIها Serverless هستند؛ حافظه
درون‌فرایندی بین requestها تضمین‌شده نیست.

Rate limiting فعلی درون‌حافظه‌ای است؛ بنابراین روی Vercel به‌صورت سراسری
تضمین نمی‌شود.

## انواع مشکل

-   deployment failure
-   build failure
-   runtime error
-   API 500
-   environment variable
-   production outage
-   regression
-   domain/DNS
-   performance

## قوانین ایمنی

هرگز مقدار secretها را درخواست نکن: - `JWT_SECRET` - `DATABASE_URL` -
`SEED_SECRET` - API keys

فقط نام متغیر و محیط (`Development/Preview/Production`) را بررسی کن.

## Build یا Runtime؟

اول مشخص کن مشکل build-time است یا runtime.

### Build failure

بخش مرتبط Build Log را بگیر و بررسی کن: - TypeScript - missing module -
build/lint - environment configuration - migration/build script -
dependency

### Runtime

اگر deployment موفق ولی برنامه خطا دارد:

``` text
endpoint
status code
runtime log
approximate time
latest deployment
```

را بررسی کن.

## API 500

مسیر:

``` text
Browser Network
→ Status Code
→ Vercel Runtime Log
→ Backend
→ Database
```

اولین فرض را Database قرار نده.

## Environment Variables

بررسی:

``` text
Variable name
Environment
Exists: Yes/No
```

مقدار secret هرگز نباید نمایش داده شود.

## Regression

اگر مشکل بعد از deployment جدید شروع شده:

``` text
Current deployment
→ Last known working deployment
→ Changes
→ Diagnosis
```

Rollback را فقط پس از بررسی و تأیید انسانی انجام بده. اگر deployment
جدید migration دیتابیس داشته، compatibility با schema فعلی را قبل از
rollback بررسی کن.

## Production Outage

Severity:

``` text
Critical: کل سامانه/Database unavailable
High: قابلیت اصلی برای کاربران زیاد unavailable
Medium: قابلیت/گروه محدود
Low: مشکل جزئی یا workaround
```

فرآیند:

``` text
Identify scope
→ deployment
→ runtime logs
→ database connectivity
→ recent changes
→ stabilize
→ verify
→ document
```

## Rate Limiting

Rate limiting فعلی instance-local است. اگر دور زده شود، آن را محدودیت
معماری فعلی بدان؛ راه‌حل مقیاس‌پذیرتر نیازمند shared store است.

## خروجی

``` text
Vercel problem:
Environment:
Affected deployment:
Symptom:
Evidence:
Current diagnosis:
Confidence:
Next safe action:
Expected result:
Rollback required:
Risk:
Human approval required:
```

## Escalation

Database production changes، migration خطرناک، restore،
authentication/security changes، outage گسترده با علت نامشخص، rollback
ناسازگار با schema و احتمال compromise شدن secretها نیازمند متخصص انسانی
هستند.
