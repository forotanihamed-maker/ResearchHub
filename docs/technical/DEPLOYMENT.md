# ResearchHub — Deployment

## Runtime

Target deployment: Vercel + PostgreSQL/Neon + Vercel Blob.

## Required Environment Variables

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (optional)
- `BLOB_READ_WRITE_TOKEN`
- `SEED_SECRET` (only if seed endpoint is intentionally enabled)

## Local Setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Use the project's actual environment template if present; never commit secrets.

## Database

Use PostgreSQL and apply Drizzle schema/migrations according to the project's migration strategy.

For Pilot, use a database isolated from development/test data.

## Health Check

```text
GET /api/health
```

Expected healthy response includes `ok: true`.

## Pilot Safety

Before real users:

- production database must be separate from development
- seed credentials must be removed/rotated
- secrets must be production-specific
- database backup/snapshot must exist
- file storage must be verified
- authorization flows must be tested
