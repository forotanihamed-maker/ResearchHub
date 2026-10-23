> **سند تاریخی:** این فایل وضعیت زمان نوشتنش را نشان می‌دهد و بعداً به‌روز نشده است. وضعیت امروز: `docs/README.md`، `docs/product/02_CURRENT_STATE.md` و `docs/CHANGELOG.md`.

# گزارش بررسی ایستای Repository — ResearchHub

- تاریخ بررسی: 2026-09-26
- منبع: فایل `ResearchHub-master.zip` ارائه‌شده در گفتگو
- روش: بررسی ساختار ZIP، `package.json`، routeها، `src/db/schema.ts`، migrationها و اسناد موجود
- محدودیت: این گزارش نتیجه اجرای برنامه نیست. وابستگی‌ها نصب نشده‌اند و typecheck، lint، build، تست integration، اتصال Neon و استقرار Vercel اجرا نشده‌اند.

## خلاصه مدیریتی

1. کد پایه‌ی محصول و فضای اجرای پروژه در ZIP موجود است؛ 11 جدول در Drizzle schema تعریف شده و routeهای پروژه، احراز هویت، پنل ادمین، فایل، پیام، Task، Milestone، Activity و Overview وجود دارند.
2. پیاده‌سازی دستیار AI که در `AI-Dev-Assistant-Spec.md` تعریف شده، در این ZIP وجود ندارد. هیچ route مربوط به `/api/reports`، `/api/errors` یا `/api/internal/ai/process`، جدول‌های `issue_reports`، `error_events`، `ai_tasks`، `ai_analysis_runs`، `ai_budget`، صفحه‌ی `/dashboard/dev/tasks`، تست Vitest یا workflow زمان‌بندی‌شده‌ی GitHub Actions در آرشیو پیدا نشد.
3. مستندات در چند محل تکرار شده‌اند. `docs/` باید مرجع اصلی مستندات پروژه باشد؛ `ResearchHub_AI_Developer_V1/` بهتر است به‌عنوان بسته‌ی قابل‌انتقال برای عامل کدنویسی نگه داشته شود، نه مرجع مستقلی که دستی و جداگانه ویرایش شود. `ai-assistant/` شامل راهنماهای عملیاتی/عیب‌یابی است و از دستیار محصولی که هنوز ساخته نشده، جداست.
4. یک مورد امنیتی برای بررسی اولویت‌دار پیدا شد: `/api/seed` راز را هم از header و هم از query string می‌پذیرد. قرار دادن راز در URL ممکن است آن را در logها یا تاریخچه ابزارها ثبت کند. در این مرحله کد را تغییر نداده‌ام؛ پیشنهاد می‌شود مسیر query string حذف شود و دسترسی endpoint بازبینی گردد.
5. محدودکننده نرخ فعلی در حافظه‌ی instance است؛ کامنت خود کد نیز محدودیت آن در Vercel/serverless را توضیح می‌دهد. این محافظت سراسری و پایدار نیست.

## موجودی فنی قابل مشاهده

### پشته
- Next.js `16.2.6`
- React `19.2.6`
- TypeScript `5.9.3`
- PostgreSQL (`pg`) و Drizzle ORM `0.45.2`
- `jsonwebtoken` و `bcryptjs`
- TanStack React Query
- Vercel Blob

### جدول‌های Drizzle
`users`, `admin_departments`, `direct_messages`, `projects`, `applications`, `project_members`, `chat_messages`, `project_files`, `tasks`, `project_milestones`, `project_activity`.

### APIها
Routeهای موجود در این ZIP شامل:
- Auth: login, logout, me, password, register
- Projects: CRUD و APIهای tasks, milestones, activity, overview, files, messages, members, invitations
- Applications و invitations/invites
- Admin: departments, faculty-overview, messages, professors, projects, stats
- Dashboard stats و health
- Seed

وجود route به‌تنهایی، آزمون صحت عملکرد یا کنترل دسترسی آن نیست.

### Migrationها
- `drizzle/0000_nervous_malcolm_colcord.sql`
- `migrations/20260818_admin_panel.sql`
- `migrations/20260906_project_type_and_progress.sql`
- `migrations/20260908_student_projects_private_invites.sql`
- `migrations/20260924_project_tasks_phase1.sql`
- `migrations/20260925_project_milestones_phase2.sql`
- `migrations/20260925b_project_activity_phase3.sql`

پیش از اعمال هر migration روی دیتابیس واقعی باید وضعیت اجرای قبلی و schema موجود بررسی شود. این بررسی فقط فایل‌ها را فهرست کرده و به دیتابیس متصل نشده است.

## وضعیت دستیار AI طبق سند طراحی

| جزء طراحی‌شده | وضعیت در ZIP بررسی‌شده |
|---|---|
| فرم گزارش مشکل و `POST /api/reports` | پیدا نشد |
| دریافت خطای سرور با `instrumentation.ts` | فایل/پیاده‌سازی مرتبط پیدا نشد |
| endpoint خطای کلاینت `POST /api/errors` | پیدا نشد |
| جداول issue/error/task/budget/analysis | در schema وجود ندارند |
| پردازشگر `POST /api/internal/ai/process` | پیدا نشد |
| اتصال به API مدل، redaction و اعتبارسنجی خروجی | پیاده‌سازی محصولی پیدا نشد |
| پنل `/dashboard/dev/tasks` | پیدا نشد |
| Vitest و golden set / `eval:triage` | پیدا نشد |
| GitHub Actions زمان‌بندی‌شده | در ZIP workflow وجود ندارد |
| دستیار عملیاتی مبتنی بر Markdown | راهنماها و playbookها موجودند، اما این‌ها به‌خودی‌خود یک سرویس AI اجراشونده نیستند |

## مسائل مستندات

- `docs/product/02_CURRENT_STATE.md` قابلیت‌های اصلی را فهرست می‌کرد، اما باید صریحاً تفاوت «route/schema موجود» و «عملکرد آزمایش‌شده» را روشن کند.
- `ai-assistant/SYSTEM_PROMPT.md` به مسیرهایی مثل `ARCHITECTURE.md` و `docs/ai-assistant/...` ارجاع می‌داد که در این ZIP با آن مسیرها وجود ندارند. ارجاع‌ها به مسیرهای واقعی اصلاح شدند.
- سه مجموعه سند با هدف‌های نزدیک وجود دارد:
  - `docs/developer-ai/`: راهنمای توسعه‌دهنده در ساختار مستندات رسمی
  - `ResearchHub_AI_Developer_V1/`: بسته‌ی مستقل/قابل‌انتقال برای عامل کدنویسی
  - `ai-assistant/`: راهنمای عیب‌یابی و playbookهای عملیاتی
- این سه مجموعه یکسان نیستند و نباید ادغام کورکورانه شوند؛ اما مسئولیت هر کدام باید واضح باشد و از نگهداری دستی چند نسخه‌ی متناقض جلوگیری شود.

## تغییرات مستنداتی انجام‌شده در این دور

1. `docs/product/02_CURRENT_STATE.md` بازنویسی شد تا:
   - قابلیت‌های قابل مشاهده در کد را از قابلیت‌های طراحی‌شده جدا کند؛
   - نبود پیاده‌سازی AI را شفاف ثبت کند؛
   - تست‌هایی را که اجرا نشده‌اند، صریحاً نام ببرد؛
   - محدودیت rate limiter و نکته‌ی query string در seed را برای پیگیری ثبت کند.
2. `ai-assistant/SYSTEM_PROMPT.md` اصلاح شد تا به مسیرهای موجود مستندات اشاره کند و صریح بگوید راهنماهای Markdown به معنی وجود سرویس AI اجراشونده نیستند.
3. این گزارش به‌عنوان سند ممیزی اضافه شد.

## گام‌های پیشنهادی بعدی

1. اجرای `npm ci`, `npm run typecheck`, `npm run lint`, `npm run build` در محیط مناسب و رفع خطاهای واقعی.
2. بازبینی امنیتی `/api/seed` و تست دسترسی‌های auth/admin، بدون دست‌کاری Production.
3. نهایی‌کردن مرجع مستندات و تولید بسته‌ی `ResearchHub_AI_Developer_V1` از روی اسناد مرجع، به‌جای ویرایش مستقل آن.
4. سپس طراحی و پیاده‌سازی فاز اول دستیار AI با approval gate، redaction، محدودیت هزینه، تست‌های واحد و پنل فقط برای صاحب پروژه.

## دامنه‌ی تغییر

در این دور فقط مستندات تغییر کرده‌اند. هیچ کد برنامه، schema یا migration، متغیر محیطی، دیتابیس، GitHub یا استقرار Vercel تغییر نکرده است.
