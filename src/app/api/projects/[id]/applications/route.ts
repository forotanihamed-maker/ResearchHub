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
import { eq, and, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const projectId = Number(id);

    // Validate project ID
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    // Only the professor who owns the project can see applications
    if (authUser.role !== "professor") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [project] = await db
      .select({
        id: projects.id,
        professorId: projects.professorId,
      })
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

    // No applications
    if (apps.length === 0) {
      return NextResponse.json({
        applications: [],
      });
    }

    // Get all student IDs
    const studentIds = apps.map((app) => app.studentId);

    // Get all skills in one query instead of one query per student
    const skillRows = await db
      .select({
        userId: userSkills.userId,
        id: skills.id,
        name: skills.name,
      })
      .from(userSkills)
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .where(inArray(userSkills.userId, studentIds));

    // Group skills by student
    const skillsByUser = new Map<number, { id: number; name: string }[]>();

    for (const skill of skillRows) {
      const current = skillsByUser.get(skill.userId) ?? [];

      current.push({
        id: skill.id,
        name: skill.name,
      });

      skillsByUser.set(skill.userId, current);
    }

    const result = apps.map((app) => ({
      ...app,
      studentSkills: skillsByUser.get(app.studentId) ?? [],
    }));

    return NextResponse.json({
      applications: result,
    });
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

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (authUser.role !== "student") {
      return NextResponse.json(
        { error: "Only students can apply" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const projectId = Number(id);

    // Validate project ID
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return NextResponse.json(
        { error: "Invalid project ID" },
        { status: 400 }
      );
    }

    const body = await req.json();

    const rawMessage = body.message;

    if (
      rawMessage !== undefined &&
      rawMessage !== null &&
      typeof rawMessage !== "string"
    ) {
      return NextResponse.json({ error: "Invalid message" }, { status: 400 });
    }

    const message = typeof rawMessage === "string" ? rawMessage.trim() : "";

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Application message is too long" },
        { status: 400 }
      );
    }

    // Check project exists and is open
    const [project] = await db
      .select({
        id: projects.id,
        status: projects.status,
        maxMembers: projects.maxMembers,
      })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.status, "open")));

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or not open" },
        { status: 404 }
      );
    }

    // Check if already applied
    const [existingApplication] = await db
      .select({
        id: applications.id,
      })
      .from(applications)
      .where(
        and(
          eq(applications.projectId, projectId),
          eq(applications.studentId, authUser.userId)
        )
      );

    if (existingApplication) {
      return NextResponse.json(
        { error: "Already applied to this project" },
        { status: 409 }
      );
    }

    // Check if already a member
    const [existingMember] = await db
      .select({
        projectId: projectMembers.projectId,
      })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, authUser.userId)
        )
      );

    if (existingMember) {
      return NextResponse.json({ error: "Already a member" }, { status: 409 });
    }

    // Check current project member count
    const members = await db
      .select({
        userId: projectMembers.userId,
      })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));

    if (members.length >= project.maxMembers) {
      return NextResponse.json({ error: "Project is full" }, { status: 409 });
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
