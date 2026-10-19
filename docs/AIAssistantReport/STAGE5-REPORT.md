# ResearchHub — Stage 5 Report

## Scope

Implemented Stage 5 for collecting user reports and server/client errors without invoking AI or creating AI tasks.

## Changed files

- `scripts/apply-migration.mjs`
- `src/lib/errorCapture.ts`
- `src/lib/errorCapture.test.ts`
- `src/lib/reportRateLimit.ts`
- `src/app/api/reports/route.ts`
- `src/app/api/reports/route.test.ts`
- `src/app/api/errors/route.ts`
- `src/app/api/errors/route.test.ts`
- `src/instrumentation.ts`
- `src/components/ReportIssueButton.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/lib/auditLog.ts`

No schema or migration SQL was modified.

## Implemented

- Transactional, database-backed per-user report limit: 5 reports/hour.
- PostgreSQL advisory transaction lock for concurrent report submissions.
- Server error capture through `instrumentation.ts` `onRequestError`.
- Client error endpoint with authentication, 8 KB body limit and per-user in-memory 30/hour limiter.
- Sensitive-data redaction for emails, bearer/JWT/token values, secrets, connection strings and key-like strings.
- Error fingerprinting and upsert-based aggregation.
- Background cleanup to keep `error_events` at a maximum of 5000 rows.
- Persian RTL report modal in Sidebar.
- New audit events for report/error rate limiting.
- Migration runner limited to SQL files inside `migrations/`, transactional, interactive confirmation or `--yes`.

## Important limitation

The Stage 5 prompt requires Zod validation, but Zod is not a direct dependency of the supplied project and adding a package would violate the stage's file-scope restrictions. Therefore the route validation is implemented with strict local TypeScript validation instead of adding Zod.

The Stage 5 prompt also requires a per-user client-error rate limit while forbidding schema changes. `error_events` has no `user_id`, so the client-error limit is implemented as a per-process in-memory per-user limiter and is not globally shared across multiple server instances. This limitation should be addressed in a later approved schema stage if globally enforced client-error limits are required.

## Verification

The supplied ZIP did not contain installed project dependencies and the execution environment could not complete `npm ci`, so these project commands could not be run successfully in this environment:

- `npm run typecheck`
- `npm test`
- `npm run lint -- --quiet`
- `npm run build`

`node --check scripts/apply-migration.mjs` passed.

No Production database was accessed or modified.

## Real PostgreSQL test

Not executed because no local PostgreSQL/Test database was available in the supplied environment and no database URL was present. No Neon/Production migration was executed.

## Stage status

Code changes for Stage 5 are prepared, but Stage 5 should **not** be marked fully verified until the four project commands and the required real PostgreSQL tests are run in the owner's development environment.
