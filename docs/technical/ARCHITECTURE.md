# ResearchHub — Architecture

## 1. Stack

- Next.js 16.2.6
- React 19.2.6
- TypeScript 5.9.3
- PostgreSQL
- Neon-compatible PostgreSQL connection
- Drizzle ORM 0.45.2
- Vercel Blob
- TanStack React Query
- Tailwind CSS 4
- JWT (`jsonwebtoken`)
- bcryptjs
- jose is present as dependency
- Vercel deployment target

## 2. Application Layers

```text
UI / Pages
   ↓
React Context + React Query
   ↓
Next.js Route Handlers (/api)
   ↓
Authentication / Authorization / Validation
   ↓
Drizzle ORM
   ↓
PostgreSQL

Project Files → Vercel Blob
```

## 3. Authentication

Authentication is cookie-based. The `auth_token` cookie contains a JWT signed with `JWT_SECRET`.

JWT payload currently contains:
- userId
- email
- role
- name

Default expiration is `7d` unless `JWT_EXPIRES_IN` is configured.

## 4. Authorization

Authorization is enforced primarily inside route handlers.

Project-level access uses `src/lib/projectAccess.ts`:
- owner
- member

Admin scope additionally uses `admin_departments`.

## 5. Middleware

`src/middleware.ts` applies to `/api/:path*` and provides:
- coarse request body size limits
- Origin/Referer based CSRF protection for mutating requests

Route-level authentication/authorization remains mandatory.

## 6. Database

Main schema is in `src/db/schema.ts`.

Core entities:
- users
- admin_departments
- projects
- applications
- project_members
- chat_messages
- project_files
- direct_messages
- tasks
- project_milestones
- project_activity

## 7. Project Execution Architecture

Tasks, milestones and activity form the current execution layer.

- Task: executable unit of work
- Milestone: formal project checkpoint
- Activity: server-generated history for task/milestone changes

## 8. File Architecture

Database stores file metadata and resulting Blob URL. Physical file bytes are stored in Vercel Blob.

Contexts:
- chat
- document
- deliverable

## 9. Admin Architecture

Admins are associated with one or more departments through `admin_departments`.

Faculty overview currently focuses on public, professor-created projects that have a member associated with an admin's assigned department. This is the current implementation, not the full future policy.

## 10. Architectural Constraints

- Stateless JWT authentication has no server-side session revocation store.
- In-memory rate limiting is not distributed.
- File storage currently uses public Blob access.
- Project permissions are route-driven rather than centralized in a policy engine.
- No dedicated domain/service layer exists; business rules are distributed across route handlers and helper modules.
