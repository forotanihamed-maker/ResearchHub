-- بخش د: طبقه‌بندی نوع پروژه + نوع پیام «به‌روزرسانی پیشرفت»
-- روش پیشنهادی اصلی همچنان: npx drizzle-kit push
-- این فایل صرفاً برای اجرای دستی/بررسی است (مشابه migrations/20260818_admin_panel.sql)

-- د.۱ — enum نوع پروژه + ستون جدید روی projects
CREATE TYPE "project_type" AS ENUM ('thesis', 'internship', 'course', 'research');

ALTER TABLE "projects"
  ADD COLUMN "type" "project_type" NOT NULL DEFAULT 'research';

-- د.۲ — افزودن مقدار جدید به enum نوع پیام
-- توجه: در PostgreSQL، ALTER TYPE ... ADD VALUE نباید داخل یک تراکنش
-- همراه با دستورات دیگر اجرا شود؛ این خط را جداگانه اجرا کنید.
ALTER TYPE "message_type" ADD VALUE IF NOT EXISTS 'progress_update';
