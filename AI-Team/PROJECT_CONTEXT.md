# ResearchHub --- PROJECT_CONTEXT

**Reference checkpoint:** 2026-08-17\
**Status:** Development / pilot stabilization

## 1. Project

ResearchHub is a university research-project management platform.

Core goals: - Professors create and manage research projects. - Students
discover open projects and submit applications. - Research teams
communicate inside the platform. - Admins supervise the
university/faculty scope.

## 2. Roles

### Student

-   Browse open projects
-   Submit applications
-   View own applications
-   View joined projects
-   Manage profile

### Professor

-   Create/manage own projects
-   Review student applications
-   Manage profile

### Admin

-   Access the admin dashboard
-   Manage assigned departments
-   View students, professors, and projects within assigned departments
-   Approve/reject professor registrations
-   Supervise projects within the admin scope

## 3. Important routes

-   `/dashboard` --- role-aware entry dashboard
-   `/dashboard/admin` --- official Admin dashboard
-   `/dashboard/admin/departments` --- Admin department management
-   `/api/admin/stats`
-   `/api/admin/departmens` --- verify actual spelling before changing
-   `/api/admin/professors`

The old `src/app/admin/` route has been removed.

## 4. Dashboard decision

`src/app/dashboard/page.tsx` was upgraded to a React Query based
dashboard for Student/Professor data.

Current product decision: - Student and Professor use the normal
dashboard. - Admin should see the same experience as `/dashboard/admin`
when visiting `/dashboard`. - Admin should not retain a useless generic
Dashboard navigation item/icon.

## 5. Admin dashboard

`src/app/dashboard/admin/page.tsx` currently provides: - Student count -
Professor count - Project count - Managed departments - Professor
approval/rejection - Admin-scoped data

The next intended capability is **project oversight**: Admin should be
able to see projects belonging to professors in the Admin's assigned
departments.

Useful project fields: - title - professor - department - status -
member count / max members - createdAt - deadline when available

## 6. Admin API behavior

### `/api/admin/stats`

Authenticates the user, verifies `role === admin`, loads the Admin's
departments, then counts: - students in those departments - professors
in those departments - projects owned by professors in those departments

If no departments are assigned, it returns zero counts.

### `/api/admin/departmens`

GET returns: - all valid departments - departments selected for the
current Admin

PATCH validates the submitted departments and replaces the Admin's
department assignments.

### `/api/admin/professors`

GET returns professors in the Admin's department scope.

PATCH allows an Admin to approve/reject a professor only when that
professor belongs to the Admin's scope. An audit log is written.

POST is intentionally disabled because professors register themselves.

## 7. Database and Seed

Database uses PostgreSQL + Drizzle ORM.

Main database files: - `src/db/schema.ts` - `src/db/index.ts` -
`src/db/seed.ts` - `src/app/api/seed/route.ts` - `drizzle.config.ts`

Recent `npx drizzle-kit push` completed successfully and reported
changes applied.

Current demo seed accounts:

  Role        Email                          Password
  ----------- ------------------------------ --------------
  Professor   ali.mohammadi@university.edu   professor123
  Professor   sara.ahmadi@university.edu     professor123
  Admin       admin@researchhub.ir           admin123
  Student     reza.karimi@student.edu        student123
  Student     maryam.hosseini@student.edu    student123
  Student     amir.rezaei@student.edu        student123

The Admin is assigned all six currently defined departments: - مهندسی
نرم‌افزار - هوش مصنوعی - شبکه‌های کامپیوتری - معماری سیستم‌های کامپیوتری -
امنیت اطلاعات - علوم داده

## 8. Login

`src/app/auth/login/page.tsx` contains the same demo credentials as the
seed.

Expected Admin flow:

`/auth/login` → Admin login → `/dashboard` → `/dashboard/admin`

## 9. Current known concerns

1.  Admin dashboard routing/navigation must be verified.
2.  Admin statistics/data have previously appeared slowly.
3.  Admin needs project-wide oversight within department scope.
4.  Demo accounts must remain synchronized with Seed.
5.  Security must ensure Admin scope is enforced server-side.
6.  TypeScript errors were previously seen in Seed and Admin dashboard
    code; always verify current status with `npm run typecheck`.

## 10. Testing baseline

Before declaring a change complete, verify when applicable:

``` text
npm run typecheck
```

Also test: - Admin login - Professor login - Student login -
`/dashboard` for each role - `/dashboard/admin` - Admin API
authorization - department scope - project visibility

## 11. Database reset policy

Current development data is not considered important production data.

A database reset + reseed may be used when explicitly justified, but it
is not automatically the solution for login/performance problems.

Before reset: - confirm there is no valuable data - document the
reason - reset - run seed - retest login and Admin data

## 12. GitHub policy

The user is currently the only developer.

Changes are intentionally **not pushed to GitHub until they are
finalized and verified**.

## 13. Development rules

-   Do not recreate the removed `/admin` structure.
-   Preserve Admin department scope.
-   Do not expose passwords in API responses.
-   Do not change unrelated architecture without justification.
-   Measure performance before blaming the database, Seed, or React
    Query.
-   Prefer existing project structure over creating duplicate
    files/routes.
-   Keep this document updated at major checkpoints.
