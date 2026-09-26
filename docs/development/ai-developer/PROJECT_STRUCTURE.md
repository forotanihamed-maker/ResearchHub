# ResearchHub — Project Structure

```text
src/
├── middleware.ts
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
│   └── api/
├── components/
├── contexts/
├── db/
├── lib/
├── drizzle/
└── migrations/
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

Before adding a file, search for an existing module with the same responsibility.
