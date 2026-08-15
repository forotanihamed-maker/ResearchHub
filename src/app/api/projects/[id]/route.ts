/*src\app\api\projects\[id]\route.ts */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, users, applications, projectMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { auditLog } from "@/lib/auditLog";
import {
  parseId,
  isValidProjectStatus,
  sanitizeTitle,
  sanitizeDescription,
  parseMaxMembers,
  parseDeadline,
  TITLE_MIN,
  TITLE_MAX,
  DESCRIPTION_MIN,
  DESCRIPTION_MAX,
} from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseId(id);
    if (projectId === null) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const [project] = await db
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
        professorAvatar: users.avatar,
      })
      .from(projects)
      .innerJoin(users, eq(projects.professorId, users.id))
      .where(eq(projects.id, projectId));

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get members
    const members = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatar: users.avatar,
        department: users.department,
        joinedAt: projectMembers.joinedAt,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId));

    // Check if current user has applied
    let myApplication = null;
    if (authUser.role === "student") {
      const [app] = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.projectId, projectId),
            eq(applications.studentId, authUser.userId)
          )
        );
      myApplication = app || null;
    }

    const isMember = members.some((m) => m.id === authUser.userId);

    return NextResponse.json({
      project: {
        ...project,
        members,
        memberCount: members.length,
        myApplication,
        isMember,
      },
    });
  } catch (error) {
    console.error("Project GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "professor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseId(id);
    if (projectId === null) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.professorId, authUser.userId)
        )
      );

    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, status, maxMembers, deadline } = body;

    // ---- Validate each field only if it was actually provided ----

    let cleanTitle: string | undefined;
    if (title !== undefined) {
      const t = sanitizeTitle(title);
      if (t === null) {
        return NextResponse.json(
          {
            error: `Title must be between ${TITLE_MIN} and ${TITLE_MAX} characters`,
          },
          { status: 400 }
        );
      }
      cleanTitle = t;
    }

    let cleanDescription: string | undefined;
    if (description !== undefined) {
      const d = sanitizeDescription(description);
      if (d === null) {
        return NextResponse.json(
          {
            error: `Description must be between ${DESCRIPTION_MIN} and ${DESCRIPTION_MAX} characters`,
          },
          { status: 400 }
        );
      }
      cleanDescription = d;
    }

    let cleanStatus: typeof status | undefined;
    if (status !== undefined) {
      if (!isValidProjectStatus(status)) {
        return NextResponse.json(
          { error: "Invalid status value" },
          { status: 400 }
        );
      }
      cleanStatus = status;
    }

    let cleanMaxMembers: number | undefined;
    if (maxMembers !== undefined) {
      const m = parseMaxMembers(maxMembers);
      if (m === null) {
        return NextResponse.json(
          { error: "maxMembers must be a positive integer" },
          { status: 400 }
        );
      }
      const [{ count: currentMemberCount }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(projectMembers)
        .where(eq(projectMembers.projectId, projectId));

      if (m < currentMemberCount) {
        return NextResponse.json(
          {
            error: `maxMembers cannot be less than the current member count (${currentMemberCount})`,
          },
          { status: 409 }
        );
      }
      cleanMaxMembers = m;
    }

    let cleanDeadline: Date | null | undefined;
    if (deadline !== undefined) {
      const parsed = parseDeadline(deadline);
      if (!parsed.ok) {
        return NextResponse.json(
          { error: "Invalid deadline date" },
          { status: 400 }
        );
      }
      cleanDeadline = parsed.value;
    }

    await db
      .update(projects)
      .set({
        title: cleanTitle,
        description: cleanDescription,
        status: cleanStatus,
        maxMembers: cleanMaxMembers,
        deadline: cleanDeadline,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    return NextResponse.json({ message: "Updated successfully" });
  } catch (error) {
    console.error("Project PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "professor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseId(id);
    if (projectId === null) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.professorId, authUser.userId)
        )
      );

    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await db.delete(projects).where(eq(projects.id, projectId));

    auditLog("project_deleted", {
      projectId,
      professorId: authUser.userId,
      title: existing.title,
    });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Project DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
