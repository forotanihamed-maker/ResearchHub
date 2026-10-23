# ResearchHub — Project Structure

```text
src/
├── proxy.ts            (CSRF Origin guard + body size cap for /api/*; there is no middleware.ts)
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── auth/{login,register}/
│   ├── invite/[token]/
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── applications/
│   │   ├── messages/
│   │   ├── my-projects/
│   │   ├── profile/
│   │   ├── projects/
│   │   └── admin/
│   │   └── dev/tasks/   (AI assistant panel, DEV_ADMIN_EMAILS only)
│   └── api/             (incl. cron/, dev/, reports/, errors/)
├── components/
├── contexts/
├── db/
├── lib/
│   ├── ai/              (triage, providers, mask, prompts, validate, budget, fixPrompt, fileHints, code/)
│   └── storage.ts       (S3 or Blob file storage)
├── drizzle/ and migrations/ (SQL)
.github/workflows/       (ci.yml, triage.yml)
scripts/                 (ai-*, apply-migration, gen-route-manifest, verify-*)
docs/
```

Important modules:
- `src/lib/auth.ts`: password/JWT/auth helpers and `getAuthUser()`
- `src/lib/permissions.ts`: admin permission helpers
- `src/lib/projectAccess.ts`: project ownership/membership access
- `src/lib/validation.ts`: input validation/sanitization
- `src/lib/rateLimit.ts`: in-memory rate limiting
- `src/lib/auditLog.ts`: audit logging
- `src/db/schema.ts`: database schema/enums
- `src/db/index.ts`: PostgreSQL/Drizzle connection
- `src/db/seed.ts`: development/demo seed
- `src/proxy.ts`: CSRF and body-size guard
- `src/lib/storage.ts`: all file save/read/delete
- `src/lib/errorCapture.ts`: error masking/capture
- `src/lib/ai/*`: AI assistant (run `node scripts/gen-route-manifest.mjs` after adding/removing pages or routes)

Before adding a file, search for an existing module with the same responsibility.
