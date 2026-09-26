# ResearchHub — Authentication & Authorization

Roles:
- `student`
- `professor`
- `admin`

Authentication:
- JWT based
- token in HttpOnly cookie `auth_token`
- stateless; no server-side session table or refresh-token system
- professor registration creates `pending` status and does not issue login token until approval

Authorization dimensions:
- role
- ownership
- membership
- admin department scope

Student: browse accessible projects, apply, manage own applications/invitations, participate in joined projects, use authorized chat/files, manage profile.

Professor: create/manage own projects, review applications, invite students, manage members, collaborate, manage files.

Admin: administrative oversight subject to assigned department scope where applicable. Scope must be enforced server-side.

Project access must consider creator/owner, membership, public/private visibility and operation-specific permissions.

Minimum security matrix:
- Student → Admin API: denied
- Professor → Admin API: denied
- Admin → own scope: allowed
- Admin → outside scope: denied where scope applies
- Non-member → protected/private project: denied
- Non-owner → owner-only mutation: denied
- Any API → password data: never returned

Known limitations:
- no email verification
- no forgot/reset password
- no refresh-token/session revocation
- no automated security test suite
