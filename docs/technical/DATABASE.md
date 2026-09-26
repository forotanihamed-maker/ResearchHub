# ResearchHub — Database

## 1. Source

Canonical schema: `src/db/schema.ts`.

Migrations: `migrations/`.

## 2. Tables

### users
Identity, role, department, profile, interests and programming languages.

### admin_departments
Maps admin users to departments they manage.

### projects
Core project record.

Important fields:
- title
- description
- status
- type
- creatorId
- creatorRole
- visibility
- inviteToken
- professorId (legacy compatibility)
- maxMembers
- deadline
- timestamps

### applications
Student membership requests and owner invitations.

### project_members
Approved project membership.

Composite primary key:
`projectId + userId`

### chat_messages
Project chat messages.

Types:
- text
- progress_update

### project_files
File metadata linked to project and optionally chat message.

Contexts:
- chat
- document
- deliverable

### direct_messages
Direct admin/professor messaging.

### tasks
Execution units with status, priority, assignee and dates.

### project_milestones
Formal project checkpoints.

### project_activity
Server-generated activity records for tasks and milestones.

## 3. Important Enums

### Roles
`student | professor | admin`

### Project status
`open | in_progress | completed`

### Project type
`thesis | internship | course | research`

### Visibility
`public | private`

### Application status
`pending | approved | rejected | cancelled`

## 4. Migrations

Current migration files include changes for:

- admin panel
- project type and progress
- student private projects/invites
- project tasks
- project milestones
- project activity

## 5. Data Integrity Notes

- Creator is inserted into project membership at project creation.
- Task assignee must be a participant; this is enforced at API level.
- Project member count excludes creator in capacity calculations.
- Activity `entityId` intentionally has no foreign key so deletion of a task/milestone does not delete historical activity records.
