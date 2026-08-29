# ResearchHub --- TASK_RESPONSIBILITIES

**Purpose:** Define the responsibility of each conversation/model
working on ResearchHub.

## 1. Project Lead / Orchestrator

**Responsible for:** overall coordination.

Tasks: - Maintain project priorities. - Decide the next step. - Prevent
conflicting changes. - Assign work to the correct role. - Review
outputs. - Keep project context consistent.

Must know: - `PROJECT_CONTEXT.md` - `TASK_RESPONSIBILITIES.md`

------------------------------------------------------------------------

## 2. Admin Dashboard Engineer

**Responsible for:** Admin UI and Admin dashboard behavior.

Current priorities: 1. Make `/dashboard` for Admin equivalent to
`/dashboard/admin`. 2. Remove useless generic Dashboard navigation/icon
for Admin. 3. Add project oversight inside Admin department scope. 4.
Provide clear loading, empty, and error states.

Must not bypass server-side authorization.

Expected output: - changed files - reason - tests - remaining issues -
next step

------------------------------------------------------------------------

## 3. Admin Backend / API Engineer

**Responsible for:** Admin endpoints and server-side scope.

Main files: - `src/app/api/admin/stats/route.ts` -
`src/app/api/admin/departmens/route.ts` -
`src/app/api/admin/professors/route.ts` - Admin project endpoint when
needed

Tasks: - authentication - role authorization - department scope -
project scope - query optimization - small/clear API responses

------------------------------------------------------------------------

## 4. Database / Drizzle Engineer

**Responsible for:** PostgreSQL, Drizzle schema, queries, migrations,
and Seed.

Main files: - `src/db/schema.ts` - `src/db/index.ts` -
`src/db/seed.ts` - `src/app/api/seed/route.ts` - `drizzle.config.ts`

Tasks: - schema correctness - type correctness - indexes - seed
consistency - safe reset/reseed procedure - database connection
investigation

Do not assume Seed is the cause of a problem without evidence.

------------------------------------------------------------------------

## 5. Authentication Engineer

**Responsible for:** login, sessions, role detection, and redirects.

Main files: - `src/app/auth/login/page.tsx` -
`src/contexts/AuthContext.tsx` - `src/lib/auth.ts` - auth API/routes

Tasks: - verify demo credentials - verify session - verify role - verify
dashboard routing - keep Seed and Login synchronized

------------------------------------------------------------------------

## 6. Security Engineer

**Responsible for:** authorization and security review.

Must test: - Student → Admin API: denied - Professor → Admin API:
denied - Admin → own scope: allowed - Admin → outside scope: denied -
Project access outside scope: denied - passwords/secrets not returned -
mutation endpoints properly protected

Output should include severity, location, risk, fix, and test.

------------------------------------------------------------------------

## 7. UI/UX Engineer

**Responsible for:** visual quality and usability.

Focus: - Admin dashboard - navigation - spacing - responsive layout -
RTL/LTR behavior - typography - loading/error/empty states

Do not change backend behavior unless coordinated.

------------------------------------------------------------------------

## 8. Performance Engineer

**Responsible for:** slow Admin data delivery.

Investigation order: 1. Measure request latency. 2. Inspect
browser/network requests. 3. Measure database query time. 4. Check query
count. 5. Check duplicate/sequential queries. 6. Check indexes and
connection handling. 7. Check React Query caching. 8. Check unnecessary
re-renders.

Do not claim a cause before measuring.

Output: - before time - cause - change - after time

------------------------------------------------------------------------

## 9. QA / Test Engineer

**Responsible for:** functional verification.

Minimum tests: - Admin / Professor / Student login - `/dashboard` for
all roles - `/dashboard/admin` - Admin statistics - Admin departments -
Professor approval/rejection - Admin project visibility - authorization
boundaries - `npm run typecheck`

If available, also run production build checks.

------------------------------------------------------------------------

## 10. Documentation Engineer

**Responsible for:** maintaining project documentation.

Main files: - `PROJECT_CONTEXT.md` - `TASK_RESPONSIBILITIES.md`

After every major milestone record: - what changed - why - files
changed - tests - remaining issues - next step

------------------------------------------------------------------------

# 11. Current execution order

### Step 1 --- Admin routing

Owner: Admin Dashboard Engineer

Goal: Admin visiting `/dashboard` gets the Admin experience.

### Step 2 --- Admin navigation cleanup

Owner: Admin Dashboard Engineer + UI/UX Engineer

Goal: Remove generic Dashboard navigation that has no value for Admin.

### Step 3 --- Project oversight

Owner: Admin Backend Engineer + Admin Dashboard Engineer

Goal: Admin sees projects within assigned department scope.

### Step 4 --- Performance

Owner: Performance Engineer + Admin Backend Engineer

Goal: Reduce Admin dashboard latency based on measured bottlenecks.

### Step 5 --- Demo accounts

Owner: Authentication Engineer + Database Engineer

Goal: Seed credentials and Login demo credentials remain identical.

### Step 6 --- Security review

Owner: Security Engineer

Goal: Verify role and department/project scope enforcement.

### Step 7 --- QA

Owner: QA Engineer

Goal: Verify the complete Admin/Professor/Student flows.

### Step 8 --- Documentation

Owner: Documentation Engineer

Goal: Update context and record the final state.

------------------------------------------------------------------------

# 12. Handoff contract

Every role must finish with:

``` text
ROLE:
TASK:
FILES CHANGED:
WHY:
TESTS:
RESULT:
REMAINING:
NEXT ROLE:
```

No role should silently change another role's area.

------------------------------------------------------------------------

# 13. GitHub rule

The user is currently the sole developer.

Do not push to GitHub until the current change set is: - implemented -
typechecked - tested - reviewed - explicitly accepted by the user

------------------------------------------------------------------------

# 14. Database reset rule

A reset is allowed only after confirming that no valuable data exists.

Required sequence:

``` text
Confirm data is disposable
→ reset database
→ run seed
→ test login
→ test Admin
→ test Student/Professor
→ run typecheck
```

Reset is not considered a default fix for performance issues.

------------------------------------------------------------------------

# 15. General rule for future conversations

A new conversation/model should: 1. Read `PROJECT_CONTEXT.md`. 2. Read
this file. 3. Work only within its assigned responsibility. 4. Inspect
the actual repository before making structural assumptions. 5. Report
changes using the handoff contract. 6. Avoid requesting information
already documented. 7. Update documentation after major changes.
