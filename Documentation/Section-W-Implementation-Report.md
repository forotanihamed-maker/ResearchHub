# گزارش تکمیل بخش و — پروژه‌سازی دانشجو + پروژه خصوصی + همکاری مستقیم دوستان

## وضعیت

بخش «و» روی نسخه نهایی دریافت‌شده از ResearchHub پیاده‌سازی شد. هدف این بخش این است که هم استاد و هم دانشجو بتوانند پروژه بسازند، پروژه‌ها بتوانند عمومی یا خصوصی باشند، و همکاری مستقیم دانشجوها با username و invitation انجام شود.

## تغییرات اصلی

### و.۱ تا و.۶ — مالکیت و پروژه‌سازی

- هر دو نقش `professor` و `student` اکنون می‌توانند `POST /api/projects` را اجرا کنند.
- ستون‌های `creatorId` و `creatorRole` به `projects` اضافه شدند.
- `professorId` برای سازگاری با داده‌ها و بخش‌های قدیمی نگه داشته شد، اما nullable شد.
- برای پروژه‌های استاد: `professorId = creatorId`.
- برای پروژه‌های دانشجویی: `professorId = null`.
- `creatorId/creatorRole` منبع اصلی تشخیص مالک پروژه هستند.
- پروژه دانشجویی به‌صورت پیش‌فرض `course` است؛ پروژه استاد به‌صورت پیش‌فرض `research` است.
- ProjectCard اکنون مشخص می‌کند پروژه توسط استاد یا دانشجو ساخته شده است.

### و.۷ تا و.۱۰ — پروژه عمومی/خصوصی

- enum جدید `projectVisibilityEnum`: `public | private`.
- ستون `visibility` با پیش‌فرض `public` اضافه شد.
- پروژه خصوصی در catalog عمومی دانشجویان نمایش داده نمی‌شود.
- عضو فعلی پروژه خصوصی همچنان به پروژه دسترسی دارد.
- سازنده همیشه به پروژه خصوصی دسترسی دارد.
- endpoint جزئیات پروژه برای کاربر غیرمجاز در پروژه خصوصی `404` برمی‌گرداند تا وجود پروژه افشا نشود.
- Admin همچنان پروژه‌ها را از طریق endpoint مدیریت می‌بیند.

### و.۱۱ تا و.۱۵ — Username

- `users.username` به‌صورت nullable و unique اضافه شد.
- قانون username: حروف انگلیسی، اعداد و `_`، بین ۳ تا ۳۰ کاراکتر.
- GET/PATCH `/api/auth/me` اکنون username را می‌خواند/به‌روزرسانی می‌کند.
- username در AuthContext نیز اضافه شد.
- جست‌وجوی دوست برای دعوت با username انجام می‌شود و email در این جریان استفاده نمی‌شود.

### و.۱۶ تا و.۲۴ — دعوت مستقیم و Application مشترک

- endpoint جدید:
  - `POST /api/projects/[id]/invite`
- فقط creator می‌تواند دعوت کند.
- فقط کاربران با role `student` قابل دعوت هستند.
- وجود کاربر، عضویت قبلی، ظرفیت و invitation pending بررسی می‌شود.
- دعوت در همان جدول `applications` ذخیره می‌شود.
- `application.source` به enum جدید `student_application | owner_invite` تبدیل شد.
- دعوت جدید با `source = owner_invite` و `status = pending` ایجاد می‌شود.
- پذیرش invitation در:
  - `PATCH /api/invitations/[id]`
- پذیرش داخل transaction و با row lock روی project انجام می‌شود.
- ظرفیت پروژه قبل از عضویت مجدد بررسی می‌شود.
- membership جدید از همان `project_members` موجود استفاده می‌کند.
- در صورت پذیرش invitation پروژه open به `in_progress` می‌رود.
- درخواست‌های عادی دانشجو از invitation جدا شده‌اند و در صفحه درخواست‌های من دوباره نمایش داده نمی‌شوند.

### و.۲۵ تا و.۲۷ — لینک دعوت خصوصی

- پروژه دارای `inviteToken` nullable و unique است.
- برای پروژه خصوصی token تصادفی امن تولید می‌شود.
- `crypto.randomBytes(32)` برای token استفاده شده است.
- تغییر Public → Private در صورت نبود token یک token جدید ایجاد می‌کند.
- تغییر Private → Public token را revoke می‌کند.
- regenerate و revoke فقط توسط creator قابل انجام است.
- endpoint پذیرش لینک:
  - `POST /api/invites/[token]`
- لینک دعوت از projectId یا userId ساخته نمی‌شود.
- صفحه `/invite/[token]` برای UX پذیرش لینک اضافه شده است.

### و.۳۱ تا و.۳۴ — مدیریت اعضا و visibility

- creator می‌تواند اعضای دیگر پروژه را حذف کند.
- creator خودش قابل حذف نیست.
- تغییر visibility از UI و API پشتیبانی می‌شود.
- اعضای فعلی هنگام Public → Private حفظ می‌شوند.
- Private → Public دوباره پروژه را وارد catalog عمومی می‌کند.

### و.۳۵ تا و.۳۸ — رابط کاربری

- فرم ساخت پروژه برای student و professor فعال است.
- انتخاب Public/Private به فرم اضافه شد.
- My Projects برای هر دو نقش فعال شد.
- Sidebar برای هر دو نقش لینک‌های «پروژه‌های من» و «پیام‌ها» را نمایش می‌دهد.
- صفحه جزئیات پروژه وضعیت Public/Private را نشان می‌دهد.
- creator بخش «دعوت دوستان» دارد.
- دعوت با username، ساخت لینک، کپی لینک و revoke لینک در UI اضافه شد.
- صفحه درخواست‌های دانشجو بخش «دعوت‌های دریافتی» دارد.
- creator در لیست اعضا با برچسب «سازنده» مشخص می‌شود و می‌تواند سایر اعضا را حذف کند.

## Migration

فایل:

`migrations/20260908_student_projects_private_invites.sql`

موارد migration:

- `users.username`
- `project_creator_role` enum
- `project_visibility` enum
- `application_source` enum
- `projects.creator_id`
- `projects.creator_role`
- `projects.visibility`
- `projects.invite_token`
- backfill پروژه‌های قدیمی از `professor_id`
- nullable شدن `professor_id`
- index/unique indexهای لازم
- `applications.source`

## فایل‌های جدید

```text
src/app/api/projects/[id]/invite/route.ts
src/app/api/invitations/route.ts
src/app/api/invitations/[id]/route.ts
src/app/api/invites/[token]/route.ts
src/app/api/projects/[id]/members/[userId]/route.ts
src/app/invite/[token]/page.tsx
migrations/20260908_student_projects_private_invites.sql
Documentation/Section-W-Implementation-Report.md
```

## فایل‌های تغییریافته

```text
src/db/schema.ts
src/lib/validation.ts
src/lib/projectAccess.ts
src/app/api/projects/route.ts
src/app/api/projects/[id]/route.ts
src/app/api/projects/[id]/applications/route.ts
src/app/api/projects/[id]/applications/[appId]/route.ts
src/app/api/applications/route.ts
src/app/api/auth/me/route.ts
src/app/api/dashboard/stats/route.ts
src/app/api/projects/[id]/messages/route.ts
src/app/api/admin/projects/route.ts
src/app/api/seed/route.ts
src/contexts/AuthContext.tsx
src/components/layout/Sidebar.tsx
src/components/projects/ProjectCard.tsx
src/app/dashboard/profile/page.tsx
src/app/dashboard/my-projects/page.tsx
src/app/dashboard/my-projects/new/page.tsx
src/app/dashboard/applications/page.tsx
src/app/dashboard/projects/[id]/page.tsx
```

## بررسی انجام‌شده

- بررسی تعادل آکولاد و پرانتز روی فایل‌های TypeScript/TSX: موفق.
- جست‌وجوی استفاده‌های باقی‌مانده از `projects.professorId` در authorizationهای اصلی: موردی باقی نماند؛ `professorId` فقط برای backward compatibility/schema و مسیرهای مدیریتی مخصوص professor باقی مانده است.
- مسیرهای جدید API ایجاد و ساختاردهی شدند.
- migration همراه پروژه قرار گرفت.

## تست‌هایی که باید روی محیط واقعی اجرا شوند

```text
☐ student creates course project
☐ professor creates research project
☐ student creates private project
☐ private project hidden from public catalog
☐ member can open private project
☐ non-member gets 404 on private project
☐ creator invites student by username
☐ pending invitation appears in dashboard
☐ invitation accept adds project member
☐ invitation reject changes invitation status
☐ full project rejects invitation
☐ invite link works
☐ revoked invite link returns 404
☐ Public → Private preserves members
☐ Private → Public appears in catalog
☐ creator removes member
☐ creator cannot remove self
☐ username validation
☐ duplicate username returns 409
☐ old professor projects remain accessible
```

## محدودیت تست این محیط

در محیط اجرای فعلی `node_modules` در ZIP وجود نداشت و تلاش برای نصب dependencyها با `npm ci` به timeout محیطی خورد؛ بنابراین `npm run typecheck` و `npm run build` کامل در این محیط اجرا نشدند. بررسی ساختاری و syntax-level انجام شد.

قبل از deploy:

```bash
npm install
npx drizzle-kit push
npm run typecheck
npm run build
```

پس از migration نیز باید تست‌های بالا روی دیتابیس واقعی و محیط Vercel اجرا شوند.
