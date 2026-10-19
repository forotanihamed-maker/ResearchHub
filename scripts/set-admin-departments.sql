-- تعیین گروه‌های آموزشی یک ادمین (فقط مالک سامانه)
--
-- روش استفاده:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -v admin_email='x@y.z' \
--     -v depts='{"هوش مصنوعی","علوم داده"}' \
--     -f scripts/set-admin-departments.sql
--
-- هشدار: فقط مالک سامانه. ابتدا روی دیتابیس آزمایشی اجرا کنید.
-- رفتار: همه‌چیز در یک transaction است. اگر ایمیل موجود نباشد، کاربر ادمین
-- نباشد یا گروه نامعتبر باشد، خطا می‌دهد و هیچ تغییری ذخیره نمی‌شود.
-- گروه‌های قبلی همان ادمین جایگزین می‌شوند؛ اجرای دوباره همان نتیجه را می‌دهد.

\set ON_ERROR_STOP on

BEGIN;

-- psql داخل بلوک DO جایگزینی متغیر انجام نمی‌دهد؛ پس ورودی‌ها را
-- به‌صورت تنظیم موقت (فقط داخل همین transaction) به بلوک می‌دهیم.
SELECT set_config('app.admin_email', :'admin_email', true),
       set_config('app.depts', :'depts', true);

DO $$
DECLARE
  v_email text := lower(trim(current_setting('app.admin_email')));
  v_depts department[] := current_setting('app.depts')::department[];  -- مقدار نامعتبر ← خطا
  v_id integer;
BEGIN
  IF v_depts IS NULL OR array_length(v_depts, 1) IS NULL THEN
    RAISE EXCEPTION 'depts خالی است';
  END IF;

  SELECT id INTO v_id FROM users WHERE lower(email) = v_email AND role = 'admin';
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'ادمینی با ایمیل % پیدا نشد', v_email;
  END IF;

  DELETE FROM admin_departments WHERE admin_id = v_id;
  INSERT INTO admin_departments (admin_id, department)
    SELECT v_id, d FROM (SELECT DISTINCT unnest(v_depts) AS d) t;
END $$;

SELECT u.email, ad.department
FROM admin_departments ad JOIN users u ON u.id = ad.admin_id
WHERE lower(u.email) = lower(trim(:'admin_email'))
ORDER BY ad.department;

COMMIT;
