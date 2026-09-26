# ResearchHub Documentation

این پوشه مرجع اصلی مستندات ResearchHub است.

## ساختار

```text
docs/
├── README.md
├── product/
│   ├── PRODUCT.md
│   ├── PRODUCT_POLICIES.md
│   ├── CURRENT_STATE.md
│   └── ROADMAP.md
├── technical/
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── SECURITY.md
│   ├── DEPLOYMENT.md
│   └── TESTING.md
├── business/
│   ├── BUSINESS_MODEL.md
│   ├── PILOT.md
│   └── INDUSTRY_LIAISON.md
├── development/
│   ├── PROJECT_STRUCTURE.md
│   ├── DEVELOPMENT_RULES.md
│   └── AI_ASSISTANT.md
└── operations/
    └── DOCUMENTATION_RULES.md
```

## اصل Source of Truth

- **کد فعلی** مرجع قابلیت‌های پیاده‌سازی‌شده است.
- `PRODUCT_POLICIES.md` مرجع سیاست‌های محصول است.
- `CURRENT_STATE.md` اختلاف بین سیاست مطلوب و وضعیت فعلی پیاده‌سازی را ثبت می‌کند.
- `ROADMAP.md` فقط آینده را توصیف می‌کند و نباید به‌عنوان قابلیت موجود خوانده شود.
- `API.md` بر اساس routeهای موجود در `src/app/api` نگهداری می‌شود.
- `DATABASE.md` بر اساس `src/db/schema.ts` و migrationها نگهداری می‌شود.

## قاعده مهم

در این مرحله توسعه قابلیت جدید متوقف است. هر تغییری که بعداً انجام شود باید ابتدا در مستند مربوطه ثبت و سپس در کد پیاده‌سازی شود.
