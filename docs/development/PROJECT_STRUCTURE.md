# ResearchHub — Project Structure

## Root

- `src/app` — Next.js pages and API routes
- `src/components` — reusable UI components
- `src/contexts` — client-side application contexts
- `src/db` — Drizzle schema, DB connection and seed
- `src/lib` — auth, validation, permissions, access helpers, rate limiting and utilities
- `migrations` — database migrations
- `drizzle` — Drizzle snapshots/config artifacts
- `docs` — product, technical, business and operational documentation

## API Structure

```text
src/app/api/
├── auth/
├── projects/
├── applications/
├── invitations/
├── invites/
├── admin/
├── dashboard/
├── health/
└── seed/
```

## Main UI Areas

- public landing page
- authentication
- dashboard
- projects
- applications
- messages
- profile
- admin dashboard
- invite flow

## Rule

New code should follow the existing domain boundaries instead of introducing duplicate business logic in unrelated components.
