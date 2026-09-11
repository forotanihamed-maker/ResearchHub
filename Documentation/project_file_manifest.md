# ResearchHub — نقشهٔ فایل‌های پروژه (همگام با کد فعلی)

> این سند از روی ساختار فعلی پروژه در تاریخ ۲۰۲۶-۰۹-۰۹ به‌روزرسانی شده است. مسیرهای migration و فایل‌های جدید featureها باید دقیقاً مطابق همین سند باشند.

## ریشهٔ پروژه

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

`drizzle.config.json` با `drizzle.config.ts` هم‌پوشانی دارد و `tsconfig.tsbuildinfo` فایل build/cache است؛ هیچ‌کدام نباید حاوی secret باشند و فایل build بهتر است در Git نگهداری نشود.

## Database / Migrations

```text
drizzle/0000_nervous_malcolm_colcord.sql
drizzle/meta/0000_snapshot.json
drizzle/meta/_journal.json
migrations/20260818_admin_panel.sql
migrations/20260906_project_type_and_progress.sql
migrations/20260908_student_projects_private_invites.sql
```

## API Routes

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
src/app/api/admin/stats/route.ts
src/app/api/admin/departments/route.ts
src/app/api/admin/professors/route.ts
src/app/api/admin/projects/route.ts
src/app/api/admin/messages/route.ts
src/app/api/seed/route.ts
```

## Pages

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

## Components / Contexts

```text
src/components/layout/Sidebar.tsx
src/components/layout/TopBar.tsx
src/components/projects/ApplicationsPanel.tsx
src/components/projects/ChatPanel.tsx
src/components/projects/ProjectCard.tsx
src/components/projects/ProjectFiles.tsx
src/components/providers/QueryProvider.tsx
src/components/ui/*.tsx
src/contexts/AuthContext.tsx
src/contexts/SidebarContext.tsx
```

## Database / Library

```text
src/db/index.ts
src/db/schema.ts
src/db/seed.ts
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

### نکات کلیدی schema فعلی

- نقش‌ها: `professor`, `student`, `admin`
- نوع پروژه: `thesis`, `internship`, `course`, `research`
- visibility: `public`, `private`
- application source: `student_application`, `owner_invite`
- message type: `text`, `progress_update`
- file context: `chat`, `document`, `deliverable`
- `projects.creatorId/creatorRole` منبع اصلی ownership است؛ `professorId` فقط برای backward compatibility نگه داشته شده است.

## وضعیت بررسی

- API، schema، migrations و مسیرهای صفحه با ساختار واقعی فعلی تطبیق داده شدند.
- مسیرهای قدیمی `src/drizzle` و `src/migrations` در پروژه وجود ندارند؛ migrationها در ریشهٔ `drizzle/` و `migrations/` هستند.
- فایل‌های فعلی مرتبط با project files، invitations، invite token و password change در manifest لحاظ شده‌اند.
