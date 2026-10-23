# ResearchHub — Database Reference

Stack: PostgreSQL + Drizzle ORM; current hosted DB: Neon.

Main tables:
`users`, `projects`, `applications`, `projectMembers`, `chatMessages`, `projectFiles`, `adminDepartments`, `directMessages`.
Project execution: `tasks`, `project_milestones`, `project_activity`.
AI assistant: `issue_reports`, `error_events`, `ai_tasks`, `ai_task_sources`, `ai_analysis_runs`, `ai_tool_calls`, `ai_pending_actions`, `ai_budget` (19 tables in `schema.ts` in total).

`project_files.file_url` holds either a legacy Blob URL or an `s3:<key>` reference (see `docs/technical/STORAGE.md`).

WARNING: the repo's migrations do NOT create `project_files` (a DB built only from `drizzle/` + `migrations/` has 18 tables). Never assume a fresh DB can be built from migrations alone; see `docs/technical/DATABASE.md`.

Relationships:
```text
users
 ├── projects
 │    ├── applications
 │    ├── projectMembers
 │    ├── chatMessages
 │    └── projectFiles
 ├── adminDepartments
 └── directMessages
```

Project ownership source of truth:
- `creatorId`
- `creatorRole`

`professorId` remains for backward compatibility. Do not remove/reinterpret it without checking consumers.

When a project is created, its creator is automatically added to `projectMembers`. Creator membership is intentionally excluded from student member counts/capacity counts.

`department` is currently a fixed PostgreSQL enum, not a table. Current values:
- مهندسی نرم‌افزار
- هوش مصنوعی
- شبکه‌های کامپیوتری
- معماری سیستم‌های کامپیوتری
- امنیت اطلاعات
- علوم داده

Project types: `thesis`, `internship`, `course`, `research`.
Visibility: `public`, `private`.
Application sources: `student_application`, `owner_invite`.
Message types: `text`, `progress_update`.
File contexts: `chat`, `document`, `deliverable`.

Application approval uses a transaction and row lock on the project to protect capacity against concurrent approvals.

For schema changes:
1. inspect `schema.ts`
2. inspect migrations
3. search consumers
4. assess compatibility/constraints/indexes
5. plan migration
6. obtain approval before risky production migration
7. verify after migration

Any operation affecting capacity, membership, application state or related records must be reviewed for race conditions.
