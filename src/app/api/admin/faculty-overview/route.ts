import { NextResponse } from "next/server";
import { db } from "@/db";
import { adminDepartments, projects, users } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

// Faculty Project Control Center — V2
//
// V2 change (on top of V1's scope, unchanged): projects are annotated with
// an explicit `reasons` array explaining why they need attention, instead
// of two separate parallel lists. Only "overdue" is a valid attention
// reason in this version — available capacity is informational only (see
// Rule B) and is never added to `reasons`. `attention` is the subset of
// `projects` whose `reasons` array is non-empty, ordered by nearest-passed
// deadline first, then by most recent activity.
//
// Scope (Option 2, approved): an admin sees a project here only if
//   1. the project is public (private projects are never shown here,
//      regardless of department — no "authorized private access" concept
//      exists yet in ResearchHub, so we do not invent one), and
//   2. the project was created by a professor (creatorRole = "professor").
//      Student-created projects are excluded entirely — Product decision,
//      Model A: ResearchHub's current focus is faculty/departmental
//      projects and professor–student collaboration; a student's own
//      project (personal or team-recruiting) is not faculty-managed
//      material, regardless of its visibility setting. This is checked
//      on the project row directly (projects.creatorRole), not inferred
//      from membership, and
//   3. at least one project member (the creator is always a member —
//      see POST /api/projects) belongs to one of the admin's assigned
//      departments (adminDepartments). This also covers cross-faculty
//      projects: any admin whose department has a participating member
//      sees the project, not only the creator's department admin.
//
// This does not change /api/admin/projects, which remains intentionally
// university-wide for its existing purpose. It also does not change any
// student-facing capability (creating/publishing/recruiting for a project
// remains exactly as it was) — this filter only affects what this one
// admin-facing endpoint returns.
export async function GET() {
  try {
    const admin = await getAuthUser();
    if (!admin)
      return NextResponse.json(
        { error: "احراز هویت نشده‌اید" },
        { status: 401 }
      );
    if (admin.role !== "admin")
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 });

    const scopeRows = await db
      .select({ department: adminDepartments.department })
      .from(adminDepartments)
      .where(eq(adminDepartments.adminId, admin.userId));
    const departments = scopeRows.map((row) => row.department);

    if (departments.length === 0) {
      return NextResponse.json({
        departments: [],
        summary: { active: 0, completed: 0, capacityAvailable: 0 },
        attention: [],
        projects: [],
      });
    }

    const departmentList = sql.join(
      departments.map((d) => sql`${d}`),
      sql`, `
    );

    const rows = await db
      .select({
        id: projects.id,
        title: projects.title,
        type: projects.type,
        status: projects.status,
        creatorName: users.name,
        creatorDepartment: users.department,
        maxMembers: projects.maxMembers,
        deadline: projects.deadline,
        createdAt: projects.createdAt,
        // Creator is excluded from the member count, matching the
        // convention already used in /api/admin/projects.
        memberCount: sql<number>`(
          select count(*)::int from project_members pm
          where pm.project_id = ${projects.id}
            and pm.user_id <> ${projects.creatorId}
        )`,
        // Most recent of: project's own updatedAt, or the newest chat
        // message (any type, including progress_update) in the project.
        // Message *content* is never selected — only its timestamp.
        lastActivityAt: sql<string>`GREATEST(
          ${projects.updatedAt},
          coalesce(
            (select max(cm.created_at) from chat_messages cm
              where cm.project_id = ${projects.id}),
            ${projects.updatedAt}
          )
        )`,
      })
      .from(projects)
      .innerJoin(users, eq(projects.creatorId, users.id))
      .where(
        and(
          eq(projects.visibility, "public"),
          eq(projects.creatorRole, "professor"),
          sql`exists (
            select 1 from project_members pm2
            inner join users u2 on u2.id = pm2.user_id
            where pm2.project_id = ${projects.id}
              and u2.department in (${departmentList})
          )`
        )
      )
      .orderBy(desc(projects.createdAt));

    const now = Date.now();
    const active = rows.filter(
      (p) => p.status === "open" || p.status === "in_progress"
    );
    const completed = rows.filter((p) => p.status === "completed");
    // Available capacity is informational only (Rule B) — it is reflected
    // in the summary card and in each project's own member/capacity
    // figures, but it is never added to a project's `reasons` and never
    // makes a project appear in `attention`.
    const capacityAvailable = active.filter(
      (p) => p.memberCount < p.maxMembers
    );

    // Rule A — the only attention reason approved for V2. A completed
    // project is never overdue, regardless of its deadline.
    const withReasons = rows.map((p) => {
      const reasons: string[] = [];
      const isOverdue =
        p.deadline !== null &&
        new Date(p.deadline).getTime() < now &&
        p.status !== "completed";
      if (isOverdue) reasons.push("مهلت انجام گذشته است");
      return { ...p, reasons };
    });

    const attention = withReasons
      .filter((p) => p.reasons.length > 0)
      .sort((a, b) => {
        // Overdue-only in V2, so this is effectively: nearest-passed
        // deadline first, then most recently active as a tiebreaker.
        const deadlineDiff =
          (a.deadline as Date).getTime() - (b.deadline as Date).getTime();
        if (deadlineDiff !== 0) return deadlineDiff;
        return (
          new Date(b.lastActivityAt).getTime() -
          new Date(a.lastActivityAt).getTime()
        );
      });

    return NextResponse.json({
      departments,
      summary: {
        active: active.length,
        completed: completed.length,
        capacityAvailable: capacityAvailable.length,
      },
      attention,
      projects: withReasons,
    });
  } catch (error) {
    console.error("Faculty overview error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
