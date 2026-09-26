# معماری
فناوری‌ها: Next.js، React، PostgreSQL، Drizzle ORM، Vercel و TanStack React Query.
ساختار: `src/app` برای صفحات/API، `src/components` برای UI، `src/contexts` برای وضعیت کلاینت، `src/lib` برای منطق مشترک/امنیت، `src/db` برای داده، `migrations` برای تغییر Schema.
جریان کلی:
UI → React Query/Contexts → API → Business/Security Utilities → Drizzle → PostgreSQL/Neon.
ساختار واقعی Repository همیشه بر مستندات قدیمی اولویت دارد.
