# ResearchHub — Coding Rules

1. Use TypeScript and preserve strict typing.
2. Follow existing Next.js App Router structure.
3. Decide server/client responsibility deliberately.
4. Never move security checks to the client for convenience.
5. Reuse existing UI primitives and React Query patterns where appropriate.
6. Validate all untrusted input server-side.
7. Keep authorization close to resource queries/mutations.
8. Prefer clear readable code; avoid unnecessarily compressed logic.
9. Avoid `any` unless explicitly justified.
10. Avoid duplicate utilities/components/routes.
11. Inspect schema/migrations before DB changes.
12. Use transactions for multi-step operations that must remain consistent.
13. Review concurrency for capacity/membership/state changes.
14. Do not expose internal errors or secrets to users.
15. Do not blame DB/seed/React Query for performance without measurement.

Performance investigation order:
request latency → browser/network → DB query time → query count → duplicate/sequential queries → indexes/connections → caching → re-renders.
