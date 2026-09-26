# API
گروه‌ها: Auth، Projects، Applications، Invitations، Files، Messages، Admin و اجرای پروژه.
APIهای اجرای پروژه:
- `/api/projects/[id]/tasks`
- `/api/projects/[id]/tasks/[taskId]`
- `/api/projects/[id]/milestones`
- `/api/projects/[id]/milestones/[milestoneId]`
- `/api/projects/[id]/activity`
- `/api/projects/[id]/overview`
اصول: Authorization سمت سرور، پاسخ کوچک، جلوگیری از N+1 و عدم ایجاد Endpoint موازی بدون نیاز.
