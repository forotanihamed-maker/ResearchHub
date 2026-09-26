# ResearchHub — Security Rules

Never request, print, commit or hardcode:
`DATABASE_URL`, `JWT_SECRET`, `BLOB_READ_WRITE_TOKEN`, `SEED_SECRET`, passwords, tokens, private keys.

Authentication:
- bcrypt password hashing
- JWT in HttpOnly cookie
- do not move token to localStorage
- pending/rejected professors remain unable to log in

Authorization:
always enforce server-side role, ownership, membership and/or department scope as appropriate.

IDOR:
any route accepting IDs/tokens must verify the user's right to access the target resource.

CSRF:
state-changing requests use middleware Origin/Referer checks. Do not weaken this casually.

Rate limiting:
current selected limits are in-memory and therefore not globally shared across Vercel serverless instances.

Audit logging:
sensitive events are logged, but current logging is not an independent tamper-proof compliance system.

Files:
when changing storage/read/download behavior, explicitly verify whether storage URLs are public or private. API authorization does not automatically make an underlying public object private.

High-risk changes:
authentication, authorization, admin scope, private files, migrations, invite tokens, production configuration.
