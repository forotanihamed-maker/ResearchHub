# استقرار
**مبنا:** 2026-10-23. محیط فعلی: Vercel (`research-hub-kohl-psi.vercel.app`) + Neon. انتقال به لیارا در `docs/MIGRATION-LIARA.md` (در انتظار بودجه).

## قبل از هر استقرار
`npm run typecheck`، `npm run lint`، `npm test`، `npm run build` (همان چهار مرحله‌ی `ci.yml` روی Node 22). تست‌های یکپارچه به `TEST_DATABASE_URL` نیاز دارند.

## متغیرهای محیطی
هسته: `DATABASE_URL`، `JWT_SECRET` (اجباری). دستیار: `docs/operations/AI_OPERATIONS.md`. فایل: `docs/technical/STORAGE.md`. فهرست نمونه: `.env.example`. بعد از تغییر متغیر، دوباره deploy یا ری‌استارت کنید.

## زمان‌بندی دستیار
GitHub Actions (`triage.yml`) با Secretهای `APP_URL` (با `https://`) و `CRON_SECRET`. روی Vercel از cron خود Vercel استفاده نمی‌شود.

## پس از استقرار
Login و نقش‌ها، `/api/health`، یک آپلود کوچک، و لاگ deployment را بررسی کنید. آپلود در Production هنوز خطای 500 دارد و علت ثابت نشده (`STORAGE.md`).

## قاعده‌ی تغییر Production
هر تغییر مهم باید اثر، ریسک، Backup، Rollback، Verification و تأیید لازم را مشخص کند. migration بدون تأیید روی Production اجرا نمی‌شود.
