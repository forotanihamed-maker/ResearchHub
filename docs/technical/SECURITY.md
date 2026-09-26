# امنیت
طبق مستندات موجود: bcrypt برای رمز، JWT در کوکی `auth_token` و `getAuthUser()` برای احراز هویت.
Authorization باید سمت سرور باشد. Student/Professor نباید به APIهای Admin دسترسی داشته باشند و Admin فقط Scope مجاز خود را ببیند.
اطلاعات حساس مانند password، JWT secret، DATABASE_URL کامل، API key و token کامل نباید درخواست یا نمایش داده شوند.
محدودیت‌های ثبت‌شده در اسناد فعلی شامل نبود تأیید ایمیل، Forgot/Reset password، Refresh token و تست خودکار امنیتی است.
