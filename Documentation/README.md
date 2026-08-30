# ResearchHub

پلتفرم اتصال اساتید و دانشجویان برای همکاری در پروژه‌های پژوهشی دانشگاهی.

استاد پروژه ایجاد می‌کند → دانشجو پروژه‌ها را مرور و درخواست عضویت می‌فرستد →
استاد درخواست را تأیید/رد می‌کند → دانشجوی تأییدشده عضو پروژه و چت گروهی می‌شود.

---

## Stack

| بخش | فناوری |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + Tailwind CSS 4 |
| Backend | Next.js API Routes (بدون سرور جداگانه) |
| Database | PostgreSQL (میزبانی روی Neon) از طریق Drizzle ORM |
| احراز هویت | JWT + bcrypt، کوکی httpOnly |
| مدیریت state سرور | @tanstack/react-query |
| Deploy | Vercel |

---

## نصب

```bash
git clone <repo-url>
cd researchhub
npm install
```

### متغیرهای محیطی

یک فایل `.env.local` در ریشهٔ پروژه بسازید:

```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
JWT_SECRET=<یک رشتهٔ تصادفی و طولانی — با openssl rand -hex 32 بسازید>
SEED_SECRET=<یک رشتهٔ تصادفی دیگر — برای محافظت از /api/seed>
```

⚠️ `.env.local` هرگز نباید commit شود (در `.gitignore` هست، همیشه چک کنید).

### اعمال Schema روی دیتابیس

```bash
npx drizzle-kit push
```

---

## اجرای Local

```bash
npm run dev
```

سپس `http://localhost:3000` را باز کنید. برای بررسی سلامت اتصال دیتابیس:

```bash
curl http://localhost:3000/api/health
# انتظار: {"ok":true}
```

### پر کردن دیتابیس با داده‌های نمونه (اختیاری، فقط برای توسعه/دمو)

```bash
curl "http://localhost:3000/api/seed?secret=<SEED_SECRET>&action=force"
```

جزئیات کامل حساب‌های تستی در [`PILOT_SETUP.md`](./PILOT_SETUP.md).

---

## بررسی‌های قبل از commit/deploy

```bash
npm run typecheck   # tsc --noEmit
npm run build       # next build — باید بدون خطا کامل شود
```

---

## مستندات مرتبط

- [`PILOT_SETUP.md`](./PILOT_SETUP.md) — راهنمای راه‌اندازی Pilot، حساب‌های تستی، roll back
- [`SECURITY.md`](./SECURITY.md) — مدل امنیتی، محدودیت‌های شناخته‌شده
