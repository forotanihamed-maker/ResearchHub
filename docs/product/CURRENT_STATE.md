# ResearchHub — Current State

**مبنای این سند: سورس موجود در ZIP پروژه در تاریخ 2026-09-26.**

## 1. وضعیت کلی

محصول از مرحله prototype ساده عبور کرده و دارای authentication، role-based access، پروژه، membership، application/invitation، chat، files، admin panel، tasks، milestones و activity history است.

## 2. قابلیت‌های پیاده‌سازی‌شده

### Authentication
- Register
- Login
- Logout
- JWT cookie authentication
- Password change
- Professor approval status
- Basic rate limiting

### Roles
- student
- professor
- admin

### Projects
- Create project
- Public/private visibility
- Project types: thesis, internship, course, research
- Project status: open, in_progress, completed
- Max members
- Deadline
- Creator identity
- Project deletion
- Project PATCH API

### Applications
- Student application
- Owner invitation
- Approve/reject/cancel flows
- Application message
- Capacity checking

### Invitations
- Direct username invitation
- Private invite token
- Invitation inbox

### Members
- Project membership
- Owner-based member removal

### Chat
- Project messages
- Edit/delete message
- Message type: text / progress_update

### Files
- Project files
- File contexts: chat / document / deliverable
- Vercel Blob storage
- 10MB file limit
- Final deliverable restricted to project owner + completed project

### Execution
- Tasks
- Task status: todo / in_progress / done
- Task priority: low / medium / high
- Task assignee
- Start/due dates
- Milestones
- Milestone status: pending / reached
- Project activity history for tasks/milestones

### Faculty/Admin
- Department assignment to admins
- Admin statistics
- Faculty overview
- Professor management
- Admin project list
- Admin messages
- Department management

### Profiles
- Name/email/bio/avatar
- University
- Department
- Username
- Interests
- Programming languages

## 3. Important Implementation Gaps

### Product policy vs code
برخی تصمیم‌های محصول که در گفتگو مشخص شده‌اند هنوز دقیقاً در کد enforce نشده‌اند. مهم‌ترین موارد:

1. **پروژه دانشجو / Admin visibility**: endpointهای admin در بعضی مسیرها هنوز دسترسی گسترده‌تری از سیاست مطلوب محصول دارند.
2. **Private project admin access**: سیاست مطلوب می‌گوید دسترسی ادمین به پروژه خصوصی نیازمند اجازه است؛ faculty-overview فعلی private projects را نمایش نمی‌دهد و مفهوم authorized-private-access هنوز پیاده نشده است.
3. **Project editing after publish**: API فعلی owner را قادر به PATCH عنوان، توضیح، وضعیت، نوع و visibility می‌کند؛ این با تصمیم اخیر «پس از انتشار اطلاعات اصلی قابل ویرایش نیست» متفاوت است.
4. **Reopen**: enum فعلی `open/in_progress/completed` است و PATCH وضعیت را می‌پذیرد؛ بنابراین immutability کامل پروژه بسته‌شده هنوز enforce نشده است.
5. **Invite token**: کد فعلی یک token پروژه نگه می‌دارد و آن را در private project استفاده می‌کند؛ شخص‌محور و یک‌بارمصرف بودن لینک هنوز به شکل کامل enforce نشده است.
6. **Search filters**: API فعلی search را برای title/description/professorName دارد؛ فیلترهای کامل حوزه تخصصی و مهارت‌های موردنیاز در مدل پروژه فعلی وجود ندارند.
7. **Project fields**: حوزه تخصصی و skills موردنیاز در schema فعلی پروژه فیلد مستقل ندارند.

## 4. Verification Note

در محیط بررسی فعلی `node_modules` نصب نبود. اجرای `npm run typecheck` بنابراین با خطاهای نبود dependencyها متوقف شد و نباید نتیجه آن به‌عنوان اثبات وجود bugهای واقعی TypeScript تفسیر شود.

## 5. Source of Truth

برای تصمیم‌گیری فنی، کد و schema فعلی معتبرتر از READMEهای قدیمی هستند. هر تناقض باید در یک issue/documentation note ثبت شود، سپس درباره تغییر تصمیم گرفته شود.
