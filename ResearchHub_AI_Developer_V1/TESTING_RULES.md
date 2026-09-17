# ResearchHub — Testing & Verification

When applicable, run:
```bash
npm run typecheck
npm run lint
npm run build
```
Only claim a check passed if it was actually run.

Authentication/dashboard changes:
- Student login
- Professor login
- Admin login
- `/dashboard` for each role
- `/dashboard/admin`

Project changes, as relevant:
Create → discover → apply/invite → review → approve/reject → membership → chat → files → state/progress.

Authorization changes:
- Student cannot access Admin-only APIs
- Professor cannot access Admin-only APIs
- Admin cannot exceed applicable department scope
- non-members cannot access protected project resources
- non-owners cannot perform owner-only mutations
- private project data does not leak

DB changes:
- schema/migration consistency
- affected queries
- constraints/indexes
- transaction behavior
- data compatibility

Report:
```text
CHECK:
COMMAND / SCENARIO:
RESULT:
EVIDENCE:
LIMITATION:
```

If automated coverage does not exist, say so.
