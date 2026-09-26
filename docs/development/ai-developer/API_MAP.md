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

Files:
- `GET/POST /api/projects/[id]/files`
- `DELETE /api/projects/[id]/files/[fileId]`

Dashboard:
- `GET /api/dashboard/stats`

Admin:
- `/api/admin/stats`
- `/api/admin/departments` (verify exact current spelling in code before changes)
- `/api/admin/professors`
- `/api/admin/projects`
- `/api/admin/messages`

System:
- `GET /api/health`
- `/api/seed` (sensitive setup endpoint)

API change rules:
- inspect route implementation and consumers
- preserve auth/authorization
- validate input server-side
- consider CSRF/rate limits for mutations
- test success and denial paths
- document meaningful contract changes
