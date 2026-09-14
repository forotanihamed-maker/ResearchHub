# ResearchHub --- PROJECT Playbook

## هدف

عیب‌یابی پروژه، مالکیت، visibility، application، invitation و membership.

## معماری واقعی

Lifecycle:

``` text
Project created
  ↓ status=open
Student application
  ↓ pending
Professor approves/rejects
  ↓
approved → projectMembers
rejected
```

اگر اولین application تأیید شود، project به `in_progress` می‌رود.

مالکیت اصلی:

``` text
projects.creatorId
projects.creatorRole
```

`professorId` برای backward compatibility است.

Creator هنگام ساخت پروژه خودکار در `projectMembers` قرار می‌گیرد؛ در برخی
شمارش‌های ظرفیت/آمار، creator عمداً از شمارش اعضای معمولی حذف می‌شود.

## Endpointهای مرتبط

``` text
/api/projects
/api/projects/[id]
/api/projects/[id]/applications
/api/projects/[id]/applications/[appId]
/api/projects/[id]/members/[userId]
/api/projects/[id]/invite
/api/invitations
/api/invitations/[id]
/api/invites/[token]
```

## فرآیند عمومی

### 1. مشخصات

``` text
User role:
Project ID:
Action:
Expected behavior:
Actual behavior:
```

### 2. وجود و وضعیت پروژه

بررسی: - project ID - وجود رکورد - status - visibility

### 3. مالکیت

بررسی `creatorId` و `creatorRole` و در صورت ارتباط `professorId`.

### 4. دسترسی

بررسی role، visibility، membership، ownership و authorization در
Backend.

### 5. API

Endpoint مرتبط و `Status Code` و `Response` را بررسی کن.

## Project Not Visible

به ترتیب:

``` text
Project exists?
→ public/private?
→ user authorized?
→ user member?
→ ownership correct?
→ API returns project?
→ frontend renders it?
```

اگر API درست است و UI غلط است، frontend را بررسی کن. اگر API غلط است،
query/permission را بررسی کن.

## Application

Endpointهای applications را بررسی کن: - application وجود دارد؟ -
student/project درست است؟ - status چیست؟ - professor مجاز است؟

تأیید application در transaction با row lock (`FOR UPDATE`) انجام می‌شود
تا ظرفیت `maxMembers` در تأیید هم‌زمان رد نشود.

## Invitation

بررسی: - invitation/token وجود دارد؟ - معتبر و قابل استفاده است؟ - پروژه
درست است؟ - user مجاز است؟ هرگز token کامل را در گزارش عمومی ثبت نکن.

## Member

رابطه‌های `projectMembers.projectId` و `projectMembers.userId` را بررسی
کن.

## Security / IDOR

اگر کاربر بتواند پروژه یا داده خصوصی کاربر دیگر را ببیند/تغییر دهد:

``` text
Security Incident
Severity: High
```

ابتدا evidence، endpoint، authorization و query را بررسی و در صورت تأیید
escalate کن.

## قوانین

در تشخیص اولیه Database را تغییر نده. مخفی بودن UI به معنی حل
authorization نیست.

## خروجی

``` text
Problem:
Project:
User role:
Current diagnosis:
Evidence:
Confidence:
Next step:
Expected result:
Risk:
```
