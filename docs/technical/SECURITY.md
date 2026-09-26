# ResearchHub — Security

## 1. Authentication

- Passwords are hashed using bcryptjs with cost factor 12.
- JWT is signed with `JWT_SECRET`.
- JWT is stored in the `auth_token` cookie.
- Default token lifetime is 7 days unless configured otherwise.

## 2. Authorization

Every protected route is expected to authenticate the current user and apply role/project membership checks.

Project access is based on:
- owner
- project membership

Admin scope is based on assigned departments.

## 3. CSRF Protection

`src/middleware.ts` checks Origin, falling back to Referer, for mutating API requests.

Requests without Origin/Referer are currently allowed.

## 4. Request Limits

- JSON-like API body: 100KB coarse Content-Length guard
- Multipart: 11MB coarse middleware guard
- File itself: 10MB downstream validation

Chunked requests without Content-Length are not covered by the middleware size check.

## 5. Rate Limiting

Current limiter is in-memory per serverless instance.

This is not a distributed production-grade rate limiter.

Recommended future direction: shared store such as Redis/Upstash if traffic requires it.

## 6. Files

Project files are uploaded to Vercel Blob with `access: public` in the current implementation.

This is a major security/product-policy consideration because product policy expects project content to be restricted to authorized users.

Before real sensitive university data is used, file access strategy must be reviewed.

## 7. Audit Logging

Audit events are currently emitted to server logs through `console.log` as JSON.

There is no durable audit-log database table in the current schema.

## 8. Session Lifecycle Gaps

Current architecture does not provide:
- refresh tokens
- server-side session revocation
- explicit logout invalidation of already-issued JWTs

## 9. Known Security Work Before Real Pilot

- Verify private file access model.
- Replace or strengthen distributed rate limiting if needed.
- Add automated authorization/IDOR tests.
- Define session revocation strategy if required.
- Define audit retention and durable audit storage.
- Disable/rotate seed credentials/secrets after initial setup.
