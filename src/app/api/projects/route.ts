/*src\app\api\projects\route.ts */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, users, applications, projectMembers } from "@/db/schema";
import { eq, inArray, desc, and, or, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import {
  sanitizeTitle,
  sanitizeDescription,
  parseMaxMembers,
  parseDeadline,
  TITLE_MIN,
  TITLE_MAX,
  DESCRIPTION_MIN,
  DESCRIPTION_MAX,
} from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const chatOnly = searchParams.get("chat");

    // Build where conditions
    const conditions = [];

    // Professors only browse their own projects. Students browse the
    // student-facing project catalog. Keep this restriction server-side
    // so hiding the navigation item is not the only protection.
    if (authUser.role === "professor" && chatOnly !== "true") {
      conditions.push(eq(projects.professorId, authUser.userId));
    }

    // "chat=true" — used by the Messages page to fetch, in one query,
    // only the projects the current user actually has a projectMembers
    // row in (works for both professors and students, since project
    // owners are also inserted as members). This is enforced here, not
    // just filtered on the frontend, so the underlying data is correct
    // regardless of caller.
    if (chatOnly === "true") {
      const myMemberships = await db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, authUser.userId));
      const memberProjectIds = myMemberships.map((m) => m.projectId);
      if (memberProjectIds.length === 0) {
        return NextResponse.json({ projects: [] });
      }
      conditions.push(inArray(projects.id, memberProjectIds));
    }

    if (status && status !== "all") {
      const validStatuses = ["open", "in_progress", "completed"];
      if (validStatuses.includes(status)) {
        conditions.push(
          eq(projects.status, status as "open" | "in_progress" | "completed")
        );
      }
    }

    // Students browsing the general catalog (not chat-scoped) should only
    // ever see projects that are still open, PLUS any project they're
    // already a member of (so an approved student doesn't lose access to
    // their own in_progress/completed project). This is enforced here —
    // not just via the frontend defaulting to ?status=open — so a direct
    // API call can't see projects that were meant to be hidden once they
    // stop recruiting.
    if (authUser.role === "student" && chatOnly !== "true") {
      const myMemberships = await db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, authUser.userId));
      const memberProjectIds = myMemberships.map((m) => m.projectId);

      const visibility =
        memberProjectIds.length > 0
          ? or(
              eq(projects.status, "open"),
              inArray(projects.id, memberProjectIds)
            )
          : eq(projects.status, "open");
      conditions.push(visibility);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const allProjects = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        status: projects.status,
        professorId: projects.professorId,
        maxMembers: projects.maxMembers,
        deadline: projects.deadline,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        professorName: users.name,
        professorDepartment: users.department,
        professorUniversity: users.university,
      })
      .from(projects)
      .innerJoin(users, eq(projects.professorId, users.id))
      .where(whereClause)
      .orderBy(desc(projects.createdAt));

    const projectIds = allProjects.map((p) => p.id);
    const professorIdByProject = new Map(
      allProjects.map((p) => [p.id, p.professorId])
    );

    // Get member counts — excluding the project owner's own auto-membership
    // row, so this number always means "recruited students", not
    // "students + the professor who created it". This is the root fix for
    // the "Team Members counts everything" bug: the professor is inserted
    // into project_members on creation (so they can access chat/ownership
    // checks), but that row should never count toward maxMembers capacity
    // or be displayed as a "member" anywhere a student-facing count is shown.
    let memberCounts: { projectId: number; count: number }[] = [];
    if (projectIds.length > 0) {
      const memberRows = await db
        .select({
          projectId: projectMembers.projectId,
          userId: projectMembers.userId,
        })
        .from(projectMembers)
        .where(inArray(projectMembers.projectId, projectIds));

      const counts = new Map<number, number>();
      for (const row of memberRows) {
        if (row.userId === professorIdByProject.get(row.projectId)) continue;
        counts.set(row.projectId, (counts.get(row.projectId) ?? 0) + 1);
      }
      memberCounts = [...counts.entries()].map(([projectId, count]) => ({
        projectId,
        count,
      }));
    }

    // Get application counts for professor view
    let appCounts: { projectId: number; count: number }[] = [];
    if (projectIds.length > 0) {
      const rawAppCounts = await db
        .select({
          projectId: applications.projectId,
          count: sql<number>`count(*)::int`,
        })
        .from(applications)
        .where(
          and(
            inArray(applications.projectId, projectIds),
            eq(applications.status, "pending")
          )
        )
        .groupBy(applications.projectId);
      appCounts = rawAppCounts;
    }

    // Assemble projects
    let result = allProjects.map((p) => {
      const memberCount =
        memberCounts.find((mc) => mc.projectId === p.id)?.count ?? 0;
      const pendingApps =
        appCounts.find((ac) => ac.projectId === p.id)?.count ?? 0;
      return {
        ...p,
        memberCount,
        pendingApplications: pendingApps,
      };
    });

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.professorName.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ projects: result });
  } catch (error) {
    console.error("Projects GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "professor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, maxMembers, deadline } = body;

    const cleanTitle = sanitizeTitle(title);
    if (cleanTitle === null) {
      return NextResponse.json(
        {
          error: `Title must be between ${TITLE_MIN} and ${TITLE_MAX} characters`,
        },
        { status: 400 }
      );
    }

    const cleanDescription = sanitizeDescription(description);
    if (cleanDescription === null) {
      return NextResponse.json(
        {
          error: `Description must be between ${DESCRIPTION_MIN} and ${DESCRIPTION_MAX} characters`,
        },
        { status: 400 }
      );
    }

    let cleanMaxMembers = 5;
    if (maxMembers !== undefined) {
      const m = parseMaxMembers(maxMembers);
      if (m === null) {
        return NextResponse.json(
          { error: "maxMembers must be a positive integer" },
          { status: 400 }
        );
      }
      cleanMaxMembers = m;
    }

    const deadlineResult = parseDeadline(deadline);
    if (!deadlineResult.ok) {
      return NextResponse.json(
        { error: "Invalid deadline date" },
        { status: 400 }
      );
    }

    const [project] = await db
      .insert(projects)
      .values({
        title: cleanTitle,
        description: cleanDescription,
        professorId: authUser.userId,
        maxMembers: cleanMaxMembers,
        deadline: deadlineResult.value,
        status: "open",
      })
      .returning();

    // Add professor as member
    await db.insert(projectMembers).values({
      projectId: project.id,
      userId: authUser.userId,
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Projects POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
