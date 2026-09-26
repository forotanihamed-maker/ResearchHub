# ResearchHub --- LOGIN Playbook

## هدف

عیب‌یابی Login، احراز هویت و دسترسی اولیه کاربران.

## معماری واقعی

-   JWT با `jsonwebtoken`
-   رمز عبور با `bcryptjs`
-   JWT در HttpOnly cookie با نام `auth_token`
-   اعتبار cookie: ۷ روز؛ `secure` در production
-   بدون server-side session و refresh token
-   `getAuthUser()` در `lib/auth.ts`
-   middleware فقط روی `/api/*`
-   محافظت صفحات dashboard با `getAuthUser()`
-   نقش‌ها: `student`, `professor`, `admin`
-   professor با وضعیت `pending` یا `rejected` نمی‌تواند Login کند.

## Endpointهای مرتبط

``` text
/api/auth/login
/api/auth/logout
/api/auth/me
/api/auth/password
/api/auth/register
```

## قوانین ایمنی

هرگز password، `JWT_SECRET`، `DATABASE_URL`، cookie/session token یا API
key را از کاربر نخواه. برای Environment Variable فقط نام متغیر را
درخواست کن.

## فرآیند مرحله‌ای

### 1. کاربر

مشخص کن مشکل برای `student`، `professor` یا `admin` است. برای professor
وضعیت `professorStatus` را نیز در نظر بگیر.

### 2. علامت دقیق

مشخص کن: - رمز اشتباه - بدون واکنش - درخواست ارسال نمی‌شود - 401 - 403 -
500 - Login موفق ولی برگشت به Login - Login موفق ولی Dashboard باز
نمی‌شود

### 3. Network

از کاربر بخواه در `F12 → Network` درخواست `/api/auth/login` را پیدا کند
و فقط این موارد را بدهد:

``` text
Status Code:
Response:
Request URL:
```

### 4. تفسیر

-   **401:** credentials یا وضعیت حساب را بررسی کن.
-   **403:** role/authorization/status را بررسی کن.
-   **500:** runtime log و سپس Database/Backend را بررسی کن.
-   **بدون request:** frontend، validation، console و network را بررسی
    کن.
-   **Login و برگشت به Login:** cookie، JWT، `getAuthUser()`، `secure` و
    expiry را بررسی کن.
-   **Login موفق ولی Dashboard ممنوع:** `/api/auth/me`، role و
    authorization را بررسی کن.

### 5. ثبت‌نام استاد

ثبت‌نام professor حساب `pending` می‌سازد و تا تأیید admin امکان Login
ندارد. دانشجو approved ساخته می‌شود.

## خروجی هر مرحله

``` text
مشکل:
تشخیص فعلی:
شواهد:
میزان اطمینان: High / Medium / Low
مرحله بعد:
اطلاعات موردنیاز:
نتیجه مورد انتظار:
اگر جواب نداد:
ریسک: Low / Medium / High
```

هر بار فقط مرحله بعدی لازم را بده و بعد از دریافت نتیجه ادامه بده.

## Escalation

مشکلات جدی JWT/authentication، تغییر security cookie، تغییر secret،
outage گسترده یا تغییر معماری احراز هویت را به متخصص انسانی ارجاع بده.
