# ResearchHub --- DATABASE Playbook

## هدف

عیب‌یابی PostgreSQL و Drizzle در ResearchHub.

## معماری واقعی

``` text
PostgreSQL
Neon
Drizzle ORM
```

جداول اصلی:

``` text
users
projects
applications
projectMembers
chatMessages
projectFiles
adminDepartments
directMessages
```

مالکیت پروژه با `creatorId` و `creatorRole` است. `professorId` backward
compatibility است. `department` یک PostgreSQL enum ثابت با ۶ مقدار است،
نه جدول. Creator پروژه خودکار عضو `projectMembers` می‌شود.

## قانون اصلی: Read-only first

در تشخیص اولیه فقط عملیات read-only، خصوصاً `SELECT`، استفاده شود.

بدون تأیید انسانی روی production انجام نده:

``` text
DELETE
UPDATE
DROP
TRUNCATE
ALTER
```

هرگز `DATABASE_URL` یا password دیتابیس را درخواست نکن.

## فرآیند

### 1. نوع مشکل

-   connection
-   query
-   missing record
-   relationship
-   migration mismatch
-   constraint
-   performance
-   data integrity
-   backup/recovery

### 2. اتصال

اگر API خطای 500، timeout یا connection error دارد، runtime log را بررسی
کن.

### 3. رکورد

در مشکلات project/user/application وجود رکورد را read-only بررسی کن.

### 4. روابط

``` text
applications.projectId → projects
applications.studentId → users
projectMembers.projectId → projects
projectMembers.userId → users
chatMessages.projectId → projects
chatMessages.senderId → users
projectFiles.projectId → projects
projectFiles.uploaderId → users
```

### Migration

اگر schema/migration error وجود دارد: 1. متن خطا را بگیر. 2.
production/development را مشخص کن. 3. migration را شناسایی کن. 4. schema
فعلی را بررسی کن. 5. backup و rollback plan را قبل از تغییر بررسی کن. 6.
برای production approval انسانی لازم است.

### Data Integrity

اگر داده ناسازگار است، ابتدا invariant و کد ایجاد/تغییر داده را بررسی
کن. مستقیماً production را اصلاح نکن.

### Concurrency

تأیید application از transaction و `FOR UPDATE` برای کنترل ظرفیت استفاده
می‌کند. خطاهای concurrency/capacity را ابتدا در منطق transaction بررسی
کن.

### Performance

endpoint، query، زمان، حجم داده، pagination و در صورت نیاز execution
plan را بررسی کن. تغییر index/schema نیازمند بررسی و rollback plan است.

### Backup/Recovery

Backup و restore عملیات High/Critical هستند. AI فقط وضعیت، آخرین backup
معتبر، هدف recovery و برنامه را بررسی/پیشنهاد کند؛ اجرای restore نیازمند
تأیید انسانی است.

## خروجی

``` text
Database problem:
Affected component:
Evidence:
Current hypothesis:
Confidence:
Safe diagnostic step:
Expected result:
Risk:
Escalation:
```
