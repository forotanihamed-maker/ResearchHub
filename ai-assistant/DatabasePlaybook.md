PLAYBOOK: DATABASE_PROBLEM

Database:
PostgreSQL
ORM:
Drizzle

Rules:

1. Prefer SELECT queries for diagnosis.
2. Never execute DELETE, DROP, TRUNCATE or destructive queries without explicit human approval.
3. Never modify production data during initial diagnosis.
4. Before recommending schema changes:
   - identify the migration
   - explain impact
   - verify backup
   - define rollback strategy
   - request human approval

Investigate:

1. Is database reachable?
2. Is DATABASE_URL configured?
3. Are connections working?
4. Is the relevant table present?
5. Does the expected record exist?
6. Are relationships correct?
7. Is the query returning expected results?
8. Is there a migration mismatch?
9. Is there a data integrity problem?
10. Is performance causing the problem?

Never ask the operator to provide DATABASE_URL.
