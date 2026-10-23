# API
**مبنا:** فهرست `route.ts`های مخزن، 2026-10-23 (۴۱ route). همه‌ی متدهای تغییردهنده از `src/proxy.ts` (CSRF و سقف بدنه) می‌گذرند. احراز هویت با کوکی `auth_token` و `getAuthUser()`، مگر در موارد ذکرشده. این سند فهرست و قرارداد کلی است؛ جزئیات هر route در کد خودش است.

## Auth
| مسیر | متد |
|---|---|
| `/api/auth/register`، `/api/auth/login`، `/api/auth/logout` | POST |
| `/api/auth/me` | GET، PATCH |
| `/api/auth/password` | PATCH |
ورود: شمارش تلاش‌های ناموفق (کلید ایمیل و IP) و ثبت `login_rate_limited`. ثبت‌نام و تغییر رمز هم سقف نرخ دارند.

## پروژه‌ها و همکاری
| مسیر | متد |
|---|---|
| `/api/projects` | GET، POST |
| `/api/projects/[id]` | GET، PATCH، DELETE |
| `/api/projects/[id]/applications` | GET، POST |
| `/api/projects/[id]/applications/[appId]` | PATCH |
| `/api/projects/[id]/invite` | POST |
| `/api/projects/[id]/members/[userId]` | DELETE |
| `/api/projects/[id]/messages` | GET، POST |
| `/api/projects/[id]/messages/[messageId]` | PATCH، DELETE (حذف، فایل‌های ضمیمه را هم پاک می‌کند) |
| `/api/projects/[id]/files` | GET، POST (multipart؛ سقف ۱۰MB) |
| `/api/projects/[id]/files/[fileId]` | GET (دانلود استریم)، DELETE |
| `/api/applications` | GET |
| `/api/invitations`، `/api/invitations/[id]` | GET؛ PATCH |
| `/api/invites/[token]` | POST |
| `/api/dashboard/stats` | GET |

## اجرای پروژه
`/api/projects/[id]/tasks` (GET، POST)، `/tasks/[taskId]` (PATCH، DELETE)، `/milestones` (GET، POST)، `/milestones/[milestoneId]` (PATCH، DELETE)، `/activity` (GET)، `/overview` (GET).

## مدیریت (admin/professor با scope مجاز)
`/api/admin/departments` (GET، PATCH)، `/api/admin/professors` (GET، POST، PATCH)، `/api/admin/projects` (GET)، `/api/admin/stats` (GET)، `/api/admin/faculty-overview` (GET)، `/api/admin/messages` (GET، POST).

## دستیار AI
| مسیر | متد | دسترسی |
|---|---|---|
| `/api/reports` | POST | کاربر واردشده؛ سقف نرخ؛ ثبت «گزارش مشکل» |
| `/api/errors` | POST | کاربر واردشده؛ سقف نرخ؛ خطای مرورگر |
| `/api/cron/triage` | GET و POST | `Authorization: Bearer CRON_SECRET`؛ بسته اگر `CRON_SECRET` نباشد |
| `/api/dev/me` | GET | فقط `DEV_ADMIN_EMAILS` |
| `/api/dev/tasks` | GET | همان |
| `/api/dev/tasks/[id]` | GET، PATCH، DELETE | همان؛ DELETE فقط برای تسک با وضعیت resolved یا dismissed، و رویداد خطای منبع را هم پاک می‌کند |
| `/api/dev/tasks/[id]/prompt` | GET | همان؛ ساخت پرامپت رفع |
| `/api/dev/tasks/[id]/analyze-code` | POST | همان؛ تحلیل با کد (۹۰ ثانیه ضد دوبار کلیک، `maxDuration=60`) |
| `/api/dev/budget` | GET، PATCH | همان؛ نمایش بودجه و توقف اضطراری |
کاربر غیرمجاز در `/api/dev/*` پاسخ **404** می‌گیرد (نه 403).

## سلامت و Seed
- `/api/health` (GET).
- `/api/seed` (GET و POST): با `SEED_SECRET`؛ بدون آن غیرفعال است. راز را از هدر `x-seed-secret` **یا `?secret=`** می‌پذیرد؛ روش query در لاگ و history می‌ماند و بهتر است حذف شود (تغییر کد، هنوز انجام نشده).

## اصول
Authorization سمت سرور، پاسخ کوچک، پرهیز از N+1، و عدم ساخت endpoint موازی بدون نیاز.
