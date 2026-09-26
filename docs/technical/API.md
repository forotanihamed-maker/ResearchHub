# ResearchHub — API Reference

> This index is generated from the route handlers currently present in `src/app/api`.

## Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |
| PATCH | `/api/auth/me` | Update profile |
| PATCH | `/api/auth/password` | Change password |

## Projects

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/projects` | Project discovery/list |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/[id]` | Project details |
| PATCH | `/api/projects/[id]` | Update project |
| DELETE | `/api/projects/[id]` | Delete project |
| GET | `/api/projects/[id]/overview` | Project overview |

## Membership / Applications

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/applications` | Current user's applications |
| GET | `/api/projects/[id]/applications` | Project applications |
| POST | `/api/projects/[id]/applications` | Apply to project |
| PATCH | `/api/projects/[id]/applications/[appId]` | Approve/reject/cancel |
| POST | `/api/projects/[id]/invite` | Direct invite |
| GET | `/api/invitations` | Received invitations |
| PATCH | `/api/invitations/[id]` | Accept/reject invitation |
| POST | `/api/invites/[token]` | Join via private invite token |
| DELETE | `/api/projects/[id]/members/[userId]` | Remove member |

## Chat

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/projects/[id]/messages` | List messages |
| POST | `/api/projects/[id]/messages` | Send message |
| PATCH | `/api/projects/[id]/messages/[messageId]` | Edit message |
| DELETE | `/api/projects/[id]/messages/[messageId]` | Delete message |

## Files

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/projects/[id]/files` | List project files |
| POST | `/api/projects/[id]/files` | Upload file |
| DELETE | `/api/projects/[id]/files/[fileId]` | Delete file |

## Tasks

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/projects/[id]/tasks` | List tasks |
| POST | `/api/projects/[id]/tasks` | Create task |
| PATCH | `/api/projects/[id]/tasks/[taskId]` | Update task |
| DELETE | `/api/projects/[id]/tasks/[taskId]` | Delete task |

## Milestones

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/projects/[id]/milestones` | List milestones |
| POST | `/api/projects/[id]/milestones` | Create milestone |
| PATCH | `/api/projects/[id]/milestones/[milestoneId]` | Update/reach milestone |
| DELETE | `/api/projects/[id]/milestones/[milestoneId]` | Delete milestone |

## Activity

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/projects/[id]/activity` | Read project activity history |

## Admin

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/admin/stats` | Admin statistics |
| GET/PATCH | `/api/admin/departments` | Admin department scope |
| GET/POST/PATCH | `/api/admin/professors` | Professor management |
| GET | `/api/admin/projects` | Admin project list |
| GET/POST | `/api/admin/messages` | Admin/professor messaging |
| GET | `/api/admin/faculty-overview` | Faculty-scoped project overview |

## Dashboard / Operations

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/dashboard/stats` | User dashboard stats |
| GET | `/api/health` | Health check |
| GET/POST | `/api/seed` | Seed/demo operations |

## API Rules

- Authentication is cookie/JWT based.
- Route handlers validate IDs and user permissions.
- Mutation endpoints are additionally protected by middleware-level origin checks.
- Error messages are generally returned as JSON `{ error: string }`.
