# ResearchHub — API Map

Base path: `/api`.
Authentication normally uses the HttpOnly `auth_token` cookie.

Authentication:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `PATCH /api/auth/password`

Projects:
- `GET/POST /api/projects`
- `GET/PATCH/DELETE /api/projects/[id]`

Applications:
- `GET /api/applications`
- `GET/POST /api/projects/[id]/applications`
- `PATCH /api/projects/[id]/applications/[appId]`

Invitations:
- `POST /api/projects/[id]/invite`
- `GET /api/invitations`
- `PATCH /api/invitations/[id]`
- `POST /api/invites/[token]`

Members:
- `DELETE /api/projects/[id]/members/[userId]`

Chat:
- `GET/POST /api/projects/[id]/messages`
- `PATCH/DELETE /api/projects/[id]/messages/[messageId]`

Files:
- `GET/POST /api/projects/[id]/files`
- `GET/DELETE /api/projects/[id]/files/[fileId]` (GET: streamed download after membership check)

Project execution:
- `GET/POST /api/projects/[id]/tasks`, `PATCH/DELETE .../tasks/[taskId]`
- `GET/POST /api/projects/[id]/milestones`, `PATCH/DELETE .../milestones/[milestoneId]`
- `GET /api/projects/[id]/activity`, `GET /api/projects/[id]/overview`

AI developer assistant (see `docs/technical/AI_ASSISTANT.md`):
- `POST /api/reports`, `POST /api/errors` (authenticated users, rate limited)
- `GET|POST /api/cron/triage` (Bearer `CRON_SECRET`, fail-closed)
- `/api/dev/*` (me, tasks, tasks/[id] incl. DELETE, tasks/[id]/prompt, tasks/[id]/analyze-code, budget): only `DEV_ADMIN_EMAILS`, everyone else gets 404

Dashboard:
- `GET /api/dashboard/stats`

Admin:
- `/api/admin/stats`
- `/api/admin/departments` (verify exact current spelling in code before changes)
- `/api/admin/faculty-overview`
- `/api/admin/professors`
- `/api/admin/projects`
- `/api/admin/messages`

System:
- `GET /api/health`
- `/api/seed` (sensitive setup endpoint; secret via `x-seed-secret` header or `?secret=` query — the query form is a known weakness)

API change rules:
- inspect route implementation and consumers
- preserve auth/authorization
- validate input server-side
- consider CSRF/rate limits for mutations
- test success and denial paths
- document meaningful contract changes
