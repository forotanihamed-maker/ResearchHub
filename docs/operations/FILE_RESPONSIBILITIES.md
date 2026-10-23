# مسئولیت فایل‌ها
`src/app/`: صفحات و API.
`src/components/`: کامپوننت‌ها.
`src/contexts/`: وضعیت کلاینت.
`src/db/schema.ts`: Schema.
`src/db/index.ts`: اتصال PostgreSQL و Drizzle.
`src/db/seed.ts`: Seed.
`src/lib/auth.ts`: احراز هویت.
`src/lib/validation.ts`: اعتبارسنجی.
`src/lib/projectAccess.ts`: دسترسی پروژه.
`src/lib/permissions.ts`: مجوزهای مدیریتی.
`src/lib/auditLog.ts`: Audit عملیاتی/امنیتی.
`src/lib/activityLog.ts`: Activity قابل مشاهده پروژه.
`src/lib/utils.ts`: ابزارهای عمومی.
`src/proxy.ts`: CSRF (Origin) و سقف بدنه برای `/api/*`.
`src/lib/storage.ts`: ذخیره، خواندن و حذف فایل (S3 یا Blob).
`src/lib/errorCapture.ts`: ثبت و ماسک خطای سرور/مرورگر؛ `sanitizeSensitiveText`.
`src/lib/reportRateLimit.ts`: سقف نرخ گزارش و خطا.
`src/lib/devAccess.ts`: تشخیص کاربر مجاز پنل (`DEV_ADMIN_EMAILS`).
`src/lib/devTasks.ts`، `devTaskDetail.ts`، `devTaskDelete.ts`: خواندن، جزئیات و حذف تسک‌های AI.
`src/lib/ai/`: دستیار — `triage`، `provider(s)`، `mask`، `prompts`، `validate`، `budget`، `fixPrompt`، `fileHints`، `routeManifest.json` (تولید با `scripts/gen-route-manifest.mjs`)، و `code/` (`pathPolicy`، `githubReader`، `config`، `analyze`).
`src/app/api/{cron,dev,reports,errors}`: routeهای دستیار.
`src/app/dashboard/dev/tasks/`: پنل دستیار.
`scripts/`: ابزار خط فرمان (`ai-budget`، `ai-retry-needs-human`، `ai-injection-eval`، `apply-migration`، `gen-route-manifest`، `set-admin-departments`، `verify-ai-*`).
`.github/workflows/`: `ci.yml` و `triage.yml`.
`docs/`: مستندات (نقشه: `DOCUMENTATION_MAP.md`).
در اختلاف سند و کد، کد واقعی مبناست و سند باید اصلاح شود.


## فایل‌های سرگردان (کاندیدای حذف، حذف نشده‌اند)
`file-api-code.txt`، `migration.diff`، `schema.ts.patch` و `PROMPT_AI_Assistant_AllPhases.md` که هم در `docs/AIAssistantReport/` و هم در `docs/developer-ai/` هست. قبل از حذف مطمئن شوید چیزی به آن‌ها ارجاع نمی‌دهد.
