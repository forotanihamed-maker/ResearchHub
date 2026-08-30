# ResearchHub — نقشهٔ فایل‌های پروژه (نسخهٔ به‌روزشده)

> این نسخه بر اساس دسترسی مستقیم به کل کد پروژه (نه فقط اسم فایل‌ها) تهیه شده.
> نسبت به نسخهٔ قبلی (`drizzle_config.zip`، ۶۷ فایل)، پروژه یک فیچر کامل («پنل ادمین دپارتمانی») اضافه کرده که در نسخهٔ قبلی اصلاً وجود نداشت.

تعداد کل فایل‌های بررسی‌شده: **۷۹** (+ ۱ فایل build-artifact که نیازی به بررسی نداره: `tsconfig.tsbuildinfo`)

## ریشهٔ پروژه (Config / Docs)

```
PILOT_SETUP.md
README.md
ResearchHub_Pilot_Roadmap_v1.0.md
SECURITY.md
drizzle.config.json          ⚠️ همچنان تکراری با .ts — قابل حذف
drizzle.config.ts
next-env.d.ts
next.config.ts
package.json
package-lock.json
postcss.config.mjs
tsconfig.json
tsconfig.tsbuildinfo         ⚠️ فایل build خودکار — نباید در Git باشد
vercel.json
```

> فایل `project_structure.txt` که در نسخهٔ قبلی manifest بود، در پروژهٔ فعلی وجود نداشت.

## Database Migrations — 🆕 دسته‌ی جدید

```
src/drizzle/0000_nervous_malcolm_colcord.sql     — migration اولیه (تمام جداول پایه)
src/migrations/20260818_admin_panel.sql          — 🆕 migration پنل ادمین (admin_departments, direct_messages)
```

## src/middleware.ts

```
src/middleware.ts     — فقط روی مسیرهای /api/* اجرا می‌شود (matcher محدود)
```

## API Routes — src/app/api/

```
src/app/api/auth/login/route.ts
src/app/api/auth/logout/route.ts
src/app/api/auth/me/route.ts
src/app/api/auth/register/route.ts
src/app/api/applications/route.ts
src/app/api/dashboard/stats/route.ts
src/app/api/health/route.ts
src/app/api/projects/route.ts
src/app/api/projects/[id]/route.ts
src/app/api/projects/[id]/applications/route.ts
src/app/api/projects/[id]/applications/[appId]/route.ts
src/app/api/projects/[id]/messages/route.ts
src/app/api/seed/route.ts

🆕 src/app/api/admin/stats/route.ts
🆕 src/app/api/admin/departments/route.ts
🆕 src/app/api/admin/professors/route.ts
🆕 src/app/api/admin/projects/route.ts
🆕 src/app/api/admin/messages/route.ts
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

🆕 src/app/dashboard/admin/page.tsx
🆕 src/app/dashboard/admin/departments/page.tsx
🆕 src/app/dashboard/admin/messages/page.tsx
```

> ⚠️ نسخهٔ قدیمی‌تر پروژه یک صفحهٔ تکراری و ناقص هم در `src/app/admin/` (بدون `dashboard/`) داشت که در جلسهٔ رفع‌اشکال قبلی به‌طور کامل **حذف شد** — دیگر در پروژه وجود ندارد.

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
src/lib/rateLimit.ts
src/lib/utils.ts
src/lib/validation.ts

🆕 src/lib/permissions.ts
```

> ⚠️ فایل `src/lib/constants.ts` که در نسخهٔ قبلی manifest ذکر شده بود، در پروژهٔ فعلی **وجود ندارد** (احتمالاً هرگز ساخته نشده یا در بازنویسی حذف شده). به‌جایش `permissions.ts` اضافه شده.

---

## وضعیت بررسی من (به‌روز)

| وضعیت                                    | تعداد | توضیح                                        |
| ---------------------------------------- | ----- | -------------------------------------------- |
| ✅ محتوا کامل بررسی و تأییدشده           | ۷۹    | تمام فایل‌های بالا مستقیماً خوانده شده       |
| 🆕 فایل‌های جدید نسبت به manifest قبلی   | ۱۰    | migration جدید + ۵ API + ۳ صفحه + ۱ فایل lib |
| ❌ فایل حذف‌شده نسبت به وضعیت قبلی پروژه | ۱     | `src/app/admin/` (صفحهٔ تکراری legacy)       |
| ❓ باقی‌مانده بدون بررسی                 | ۰     | —                                            |

این نسخه، بر خلاف نسخهٔ قبلی، **مستقیماً از روی محتوای واقعی فایل‌ها** نوشته شده، نه فقط اسم و مسیر آن‌ها.
