import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  applications,
  projects,
  users,
  projectMembers,
  userSkills,
  skills,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = parseInt(id);

    // Only professor who owns this project can see all applications
    if (authUser.role === "professor") {
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, projectId),
            eq(projects.professorId, authUser.userId)
          )
        );

      if (!project) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const apps = await db
        .select({
          id: applications.id,
          projectId: applications.projectId,
          studentId: applications.studentId,
          status: applications.status,
          message: applications.message,
          createdAt: applications.createdAt,
          updatedAt: applications.updatedAt,
          studentName: users.name,
          studentEmail: users.email,
          studentAvatar: users.avatar,
          studentDepartment: users.department,
          studentUniversity: users.university,
        })
        .from(applications)
        .innerJoin(users, eq(applications.studentId, users.id))
        .where(eq(applications.projectId, projectId))
        .orderBy(applications.createdAt);

      // Get skills for each student
      const result = await Promise.all(
        apps.map(async (app) => {
          const studentSkills = await db
            .select({ id: skills.id, name: skills.name })
            .from(userSkills)
            .innerJoin(skills, eq(userSkills.skillId, skills.id))
            .where(eq(userSkills.userId, app.studentId));
          return { ...app, studentSkills };
        })
      );

      return NextResponse.json({ applications: result });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("Applications GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role !== "student") {
      return NextResponse.json({ error: "Only students can apply" }, { status: 403 });
    }

    const { id } = await params;
    const projectId = parseInt(id);
    const body = await req.json();
    const { message } = body;

    // Check project exists and is open
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.status, "open")));

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or not open" },
        { status: 404 }
      );
    }

    // Check not already applied
    const [existing] = await db
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.projectId, projectId),
          eq(applications.studentId, authUser.userId)
        )
      );

    if (existing) {
      return NextResponse.json(
        { error: "Already applied to this project" },
        { status: 409 }
      );
    }

    // Check not already a member
    const [isMember] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, authUser.userId)
        )
      );

    if (isMember) {
      return NextResponse.json(
        { error: "Already a member" },
        { status: 409 }
      );
    }

    const [app] = await db
      .insert(applications)
      .values({
        projectId,
        studentId: authUser.userId,
        message: message || null,
        status: "pending",
      })
      .returning();

    return NextResponse.json({ application: app }, { status: 201 });
  } catch (error) {
    console.error("Application POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
