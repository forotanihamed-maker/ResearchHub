import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  projects,
  projectSkills,
  skills,
  users,
  applications,
  projectMembers,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
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

    // Get project skills
    const pSkills = await db
      .select({ id: skills.id, name: skills.name })
      .from(projectSkills)
      .innerJoin(skills, eq(projectSkills.skillId, skills.id))
      .where(eq(projectSkills.projectId, projectId));

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
        skills: pSkills,
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
    const projectId = parseInt(id);

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
    const { title, description, status, maxMembers, deadline, skillIds } = body;

    await db
      .update(projects)
      .set({
        title: title || undefined,
        description: description || undefined,
        status: status || undefined,
        maxMembers: maxMembers || undefined,
        deadline: deadline !== undefined ? (deadline ? new Date(deadline) : null) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, projectId));

    if (skillIds !== undefined) {
      await db
        .delete(projectSkills)
        .where(eq(projectSkills.projectId, projectId));
      if (skillIds.length > 0) {
        await db.insert(projectSkills).values(
          skillIds.map((sid: number) => ({
            projectId,
            skillId: sid,
          }))
        );
      }
    }

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
    const projectId = parseInt(id);

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

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("Project DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
