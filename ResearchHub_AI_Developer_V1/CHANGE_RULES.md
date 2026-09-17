# ResearchHub — Change Rules

Core principle: **minimum necessary change**.

Before coding:
- inspect actual implementation
- identify affected files and consumers
- assess DB/API/UI/security/authorization/concurrency impact
- identify regression risk

Do not:
- rewrite the application without compelling reason
- refactor unrelated code
- create duplicate routes
- recreate removed `/admin` architecture
- weaken security
- expose secrets
- casually alter schema
- reset production data as a bug fix
- trust stale documentation over code

Database changes require schema/migration review and compatibility analysis.
API changes require consumer analysis.
Authentication/authorization changes are high risk.
File/storage changes require explicit privacy/access review.

Completion means:
implemented + typechecked + applicable tests/checks + security review when relevant + remaining risks reported.
