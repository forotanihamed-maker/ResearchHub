/*src\app\api\dashboard\stats\route.ts */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, applications, projectMembers, users } from "@/db/schema";
import { eq, and, inArray, ne, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authUser.role === "professor") {
      // Professor stats
      const [totalProjects] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects)
        .where(eq(projects.professorId, authUser.userId));

      const [openProjects] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects)
        .where(
          and(
            eq(projects.professorId, authUser.userId),
            eq(projects.status, "open")
          )
        );

      const [inProgressProjects] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects)
        .where(
          and(
            eq(projects.professorId, authUser.userId),
            eq(projects.status, "in_progress")
          )
        );

      const [completedProjects] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects)
        .where(
          and(
            eq(projects.professorId, authUser.userId),
            eq(projects.status, "completed")
          )
        );

      // Get all project IDs for this professor
      const myProjects = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.professorId, authUser.userId));

      const myProjectIds = myProjects.map((p) => p.id);

      let totalApplications = 0;
      let pendingApplications = 0;
      let totalMembers = 0;

      if (myProjectIds.length > 0) {
        const [appCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(applications)
          .where(inArray(applications.projectId, myProjectIds));

        const [pendingCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(applications)
          .where(
            and(
              inArray(applications.projectId, myProjectIds),
              eq(applications.status, "pending")
            )
          );

        // Excludes the professor's own auto-membership row in each of
        // their projects — this stat should mean "students you've
        // recruited across your projects", not "students + yourself
        // counted once per project you own".
        const [memberCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(projectMembers)
          .where(
            and(
              inArray(projectMembers.projectId, myProjectIds),
              ne(projectMembers.userId, authUser.userId)
            )
          );

        totalApplications = appCount?.count ?? 0;
        pendingApplications = pendingCount?.count ?? 0;
        totalMembers = memberCount?.count ?? 0;
      }

      return NextResponse.json({
        stats: {
          totalProjects: totalProjects?.count ?? 0,
          openProjects: openProjects?.count ?? 0,
          inProgressProjects: inProgressProjects?.count ?? 0,
          completedProjects: completedProjects?.count ?? 0,
          totalApplications,
          pendingApplications,
          totalMembers,
        },
      });
    } else {
      // Student stats
      const [totalApps] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(applications)
        .where(eq(applications.studentId, authUser.userId));

      const [pendingApps] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(applications)
        .where(
          and(
            eq(applications.studentId, authUser.userId),
            eq(applications.status, "pending")
          )
        );

      const [approvedApps] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(applications)
        .where(
          and(
            eq(applications.studentId, authUser.userId),
            eq(applications.status, "approved")
          )
        );

      const [memberOfCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(projectMembers)
        .where(eq(projectMembers.userId, authUser.userId));

      const [openProjectCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects)
        .where(eq(projects.status, "open"));

      return NextResponse.json({
        stats: {
          totalApplications: totalApps?.count ?? 0,
          pendingApplications: pendingApps?.count ?? 0,
          approvedApplications: approvedApps?.count ?? 0,
          projectsJoined: memberOfCount?.count ?? 0,
          openProjects: openProjectCount?.count ?? 0,
        },
      });
    }
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
