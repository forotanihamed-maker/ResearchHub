# ResearchHub — نقشهٔ فایل‌های پروژه (drizzle_config.zip)

فهرست کامل مسیر فایل‌ها، دسته‌بندی‌شده. تعداد کل: ۶۷ فایل.

## ریشهٔ پروژه (Config / Docs)
```
PILOT_SETUP.md
README.md
SECURITY.md
drizzle.config.json          ⚠️ (باید حذف شود — تکراری با .ts)
drizzle.config.ts
next-env.d.ts
next.config.ts
package.json
package-lock.json
postcss.config.mjs
project_structure.txt
tsconfig.json
vercel.json
```

## src/middleware.ts
```
src/middleware.ts
```

## API Routes — src/app/api/
```
src/app/api/applications/route.ts
src/app/api/auth/login/route.ts
src/app/api/auth/logout/route.ts
src/app/api/auth/me/route.ts
src/app/api/auth/register/route.ts
src/app/api/dashboard/stats/route.ts
src/app/api/health/route.ts
src/app/api/projects/route.ts
src/app/api/projects/[id]/route.ts
src/app/api/projects/[id]/applications/route.ts
src/app/api/projects/[id]/applications/[appId]/route.ts
src/app/api/projects/[id]/messages/route.ts
src/app/api/seed/route.ts
```

## صفحات — src/app/
```
src/app/layout.tsx
src/app/page.tsx
src/app/globals.css
src/app/auth/login/page.tsx
src/app/auth/register/page.tsx
src/app/dashboard/layout.tsx
src/app/dashboard/page.tsx
src/app/dashboard/applications/page.tsx
src/app/dashboard/messages/page.tsx
src/app/dashboard/my-projects/page.tsx
src/app/dashboard/my-projects/new/page.tsx
src/app/dashboard/profile/page.tsx
src/app/dashboard/projects/page.tsx
src/app/dashboard/projects/[id]/page.tsx
```

## کامپوننت‌ها — src/components/
```
src/components/layout/Sidebar.tsx
src/components/layout/TopBar.tsx
src/components/projects/ApplicationsPanel.tsx
src/components/projects/ChatPanel.tsx
src/components/projects/ProjectCard.tsx
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

## Context — src/contexts/
```
src/contexts/AuthContext.tsx
src/contexts/SidebarContext.tsx
```

## Database — src/db/
```
src/db/index.ts
src/db/schema.ts
src/db/seed.ts
```

## توابع کمکی — src/lib/
```
src/lib/auditLog.ts
src/lib/auth.ts
src/lib/constants.ts
src/lib/rateLimit.ts
src/lib/utils.ts
src/lib/validation.ts
```

---

## وضعیت بررسی من (تا این لحظه)

| وضعیت | تعداد | فایل‌ها |
|---|---|---|
| ✅ محتوا بررسی‌شده | ۲ | `drizzle.config.json`, `drizzle.config.ts` |
| ❓ فقط اسم/مسیر معلوم، محتوا هنوز بررسی‌نشده | ۶۵ | همهٔ بقیه |
