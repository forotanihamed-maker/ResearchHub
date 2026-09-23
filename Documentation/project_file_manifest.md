# ResearchHub — نقشهٔ فایل‌های پروژه (همگام با نسخهٔ فعلی)

> تاریخ بازبینی: ۲۰۲۶-۰۹-۲۴
>
> این سند با تطبیق ساختار مستندات و فایل‌های کد ارسالی بازبینی شده است. مسیرهای API و فایل‌های اصلی زیر بر اساس ساختار فعلی `src/` ثبت شده‌اند. فایل‌های migration در بستهٔ کد ارسالی موجود نبودند، بنابراین نام migrationهای ثبت‌شده در مستندات قبلی به‌عنوان سابقهٔ مستندات حفظ شده‌اند و به‌عنوان فایل مشاهده‌شده در بستهٔ کد ادعا نمی‌شوند.

## 1. ریشهٔ پروژه

```text
.gitignore
README.md
drizzle.config.json
drizzle.config.ts
next-env.d.ts
next.config.ts
package.json
package-lock.json
postcss.config.mjs
tsconfig.json
tsconfig.tsbuildinfo
vercel.json
```

نکات:

- `drizzle.config.json` و `drizzle.config.ts` هم‌پوشانی دارند؛ نسخهٔ مورد استفاده باید در پروژه مشخص و نسخهٔ بلااستفاده حذف/مستند شود.
- `tsconfig.tsbuildinfo` فایل build/cache است و بهتر است در Git نگهداری نشود.
- فایل‌های تنظیمات و build نباید شامل secret باشند.

## 2. Database / Migrations

در مستندات پروژه این migrationها ثبت شده‌اند:

```text
drizzle/0000_nervous_malcolm_colcord.sql
drizzle/meta/0000_snapshot.json
drizzle/meta/_journal.json
migrations/20260818_admin_panel.sql
migrations/20260906_project_type_and_progress.sql
migrations/20260908_student_projects_private_invites.sql
```

> در `src(1).zip` ارسالی، پوشه‌های `drizzle/` و `migrations/` وجود نداشتند؛ بنابراین برای تأیید فیزیکی migrationها باید archive/deployment شامل آن‌ها نیز بررسی شود.

## 3. API Routes

```text
src/app/api/auth/login/route.ts
src/app/api/auth/logout/route.ts
src/app/api/auth/me/route.ts
src/app/api/auth/password/route.ts
src/app/api/auth/register/route.ts

src/app/api/applications/route.ts
src/app/api/dashboard/stats/route.ts
src/app/api/health/route.ts

src/app/api/invitations/route.ts
src/app/api/invitations/[id]/route.ts
src/app/api/invites/[token]/route.ts

src/app/api/projects/route.ts
src/app/api/projects/[id]/route.ts
src/app/api/projects/[id]/applications/route.ts
src/app/api/projects/[id]/applications/[appId]/route.ts
src/app/api/projects/[id]/files/route.ts
src/app/api/projects/[id]/files/[fileId]/route.ts
src/app/api/projects/[id]/invite/route.ts
src/app/api/projects/[id]/members/[userId]/route.ts
src/app/api/projects/[id]/messages/route.ts
src/app/api/projects/[id]/messages/[messageId]/route.ts

src/app/api/admin/stats/route.ts
src/app/api/admin/departments/route.ts
src/app/api/admin/professors/route.ts
src/app/api/admin/projects/route.ts
src/app/api/admin/messages/route.ts
src/app/api/admin/faculty-overview/route.ts

src/app/api/seed/route.ts
```

### نکتهٔ جدید

مسیر زیر باید در تمام manifestها و مستندات API لحاظ شود:

```text
src/app/api/admin/faculty-overview/route.ts
```

این endpoint برای «Faculty Project Control Center» است و منطق scope مستقل خود را دارد؛ نباید با `/api/admin/projects` یکی فرض شود.

## 4. Pages

```text
src/app/page.tsx
src/app/layout.tsx
src/app/globals.css

src/app/auth/login/page.tsx
src/app/auth/register/page.tsx
src/app/invite/[token]/page.tsx

src/app/dashboard/layout.tsx
src/app/dashboard/page.tsx
src/app/dashboard/applications/page.tsx
src/app/dashboard/messages/page.tsx
src/app/dashboard/my-projects/page.tsx
src/app/dashboard/my-projects/new/page.tsx
src/app/dashboard/profile/page.tsx
src/app/dashboard/projects/page.tsx
src/app/dashboard/projects/[id]/page.tsx

src/app/dashboard/admin/page.tsx
src/app/dashboard/admin/departments/page.tsx
src/app/dashboard/admin/messages/page.tsx
```

مسیر قدیمی `src/app/admin/` در ساختار فعلی مشاهده نشد.

## 5. Components

```text
src/components/layout/Sidebar.tsx
src/components/layout/TopBar.tsx

src/components/projects/ApplicationsPanel.tsx
src/components/projects/ChatPanel.tsx
src/components/projects/ProjectCard.tsx
src/components/projects/ProjectFiles.tsx

src/components/providers/QueryProvider.tsx

src/components/ui/Avatar.tsx
src/components/ui/Badge.tsx
src/components/ui/Button.tsx
src/components/ui/Card.tsx
src/components/ui/EmptyState.tsx
src/components/ui/ErrorState.tsx
src/components/ui/Input.tsx
src/components/ui/Modal.tsx
src/components/ui/Skeleton.tsx
```

## 6. Contexts

```text
src/contexts/AuthContext.tsx
src/contexts/SidebarContext.tsx
```

## 7. Database

```text
src/db/index.ts
src/db/schema.ts
src/db/seed.ts
```

### جداول اصلی schema

```text
users
projects
applications
project_members
chat_messages
project_files
admin_departments
direct_messages
```

### enumهای مهم

```text
role:
  professor | student | admin

professorStatus:
  pending | approved | rejected

projectStatus:
  open | in_progress | completed

projectType:
  thesis | internship | course | research

projectVisibility:
  public | private

applicationSource:
  student_application | owner_invite

messageType:
  text | progress_update

fileContext:
  chat | document | deliverable
```

### ownership

مرجع اصلی ownership پروژه:

```text
projects.creatorId
projects.creatorRole
```

`professorId` برای backward compatibility باقی مانده و source of truth جدید ownership نیست.

## 8. Library / Security Utilities

```text
src/lib/auth.ts
src/lib/auditLog.ts
src/lib/messages.fa.ts
src/lib/permissions.ts
src/lib/projectAccess.ts
src/lib/rateLimit.ts
src/lib/utils.ts
src/lib/validation.ts
src/middleware.ts
```

## 9. وضعیت اعتبار manifest

موارد مهمی که در این بازبینی اصلاح/تأیید شدند:

- `admin/faculty-overview/route.ts` به manifest اضافه شد.
- هر دو route پیام پروژه با `[messageId]` ثبت شدند.
- تفاوت `/api/admin/projects` و `/api/admin/faculty-overview` صریح شد.
- نبود migrationها در `src(1).zip` صریحاً ثبت شد تا بین «مستندات migration» و «فایل واقعاً مشاهده‌شده» اشتباه ایجاد نشود.
- ساختار فعلی صفحات admin و حذف مسیر قدیمی `src/app/admin/` حفظ شد.
