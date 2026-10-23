# ResearchHub — مستندات رسمی
این مجموعه مرجع یکپارچه مستندات ResearchHub است. اسناد به پنج حوزه‌ی محصول، فنی، عملیات، کسب‌وکار و Developer AI تقسیم شده‌اند. نقشه‌ی کامل: `DOCUMENTATION_MAP.md`.

ResearchHub در مرحله MVP/پایلوت است. قاعده‌ی اصلی: قابلیت فعلی، وضعیت واقعی کد است؛ ایده‌های آینده نباید به‌عنوان قابلیت موجود معرفی شوند. آخرین هم‌ترازی اسناد با کد: **2026-10-23** (`CHANGELOG.md`).

## از کجا شروع کنم؟
- می‌خواهم بفهمم پروژه چیست و در چه وضعیتی است: `product/01_PRODUCT.md`، `product/02_CURRENT_STATE.md`.
- می‌خواهم کد را بفهمم: `technical/ARCHITECTURE.md`، `technical/API.md`، `technical/DATABASE.md`.
- دستیار هوش مصنوعی: `technical/AI_ASSISTANT.md` (طراحی) و `operations/AI_OPERATIONS.md` (راه‌اندازی و عیب‌یابی).
- فایل‌ها و آپلود: `technical/STORAGE.md`.
- انتقال به سرور ایرانی: `MIGRATION-LIARA.md`.

## مرجع و اعتبارسنجی
مرجع اصلی اسناد این پوشه است. بسته‌ی `ResearchHub_AI_Developer_V1/` برای انتقال context به عامل کدنویسی است و باید با این اسناد همگام بماند. پوشه‌ی `ai-assistant/` راهنمای عملیاتی و playbook برای کمک به عیب‌یابی است؛ پیاده‌سازی دستیار در `src/lib/ai/` و `src/app/api/{cron,dev,reports,errors}` است. `AIAssistantReport/` و `REPOSITORY_AUDIT_2026-09-26.md` اسناد تاریخی‌اند و وضعیت امروز را نشان نمی‌دهند.
