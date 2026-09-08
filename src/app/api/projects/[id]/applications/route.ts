/*src\app\api\projects\[id]\applications\route.ts */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applications, projects, users, projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: "احراز هویت نشده‌اید" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const projectId = Number(id);

    // Validate project ID
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return NextResponse.json(
        { error: "شناسه پروژه نامعتبر است" },
        { status: 400 }
      );
    }


    const [project] = await db
      .select({
        id: projects.id,
        creatorId: projects.creatorId,
      })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.creatorId, authUser.userId)
        )
      );

    if (!project) {
      return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 });
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
        studentInterests: users.interests,
        studentProgrammingLanguages: users.programmingLanguages,
      })
      .from(applications)
      .innerJoin(users, eq(applications.studentId, users.id))
      .where(eq(applications.projectId, projectId))
      .orderBy(applications.createdAt);

    return NextResponse.json({
      applications: apps,
    });
  } catch (error) {
    console.error("Applications GET error:", error);

    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: "احراز هویت نشده‌اید" },
        { status: 401 }
      );
    }

    if (authUser.role !== "student") {
      return NextResponse.json(
        { error: "فقط دانشجویان می‌توانند درخواست ارسال کنند" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const projectId = Number(id);

    // Validate project ID
    if (!Number.isInteger(projectId) || projectId <= 0) {
      return NextResponse.json(
        { error: "شناسه پروژه نامعتبر است" },
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
      return NextResponse.json({ error: "پیام نامعتبر است" }, { status: 400 });
    }

    const message = typeof rawMessage === "string" ? rawMessage.trim() : "";

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "متن درخواست بیش از حد طولانی است" },
        { status: 400 }
      );
    }

    // Check project exists and is open
    const [project] = await db
      .select({
        id: projects.id,
        status: projects.status,
        maxMembers: projects.maxMembers,
        creatorId: projects.creatorId,
      })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.status, "open")));

    if (!project) {
      return NextResponse.json(
        { error: "پروژه یافت نشد یا باز نیست" },
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
        { error: "قبلاً برای این پروژه درخواست داده‌اید" },
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
      return NextResponse.json(
        { error: "شما از قبل عضو هستید" },
        { status: 409 }
      );
    }

    // Check current project member count (excluding the professor's own
    // auto-membership row — maxMembers is meant to cap recruited students,
    // not include the project owner).
    const members = await db
      .select({
        userId: projectMembers.userId,
      })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));

    const studentMemberCount = members.filter(
      (m) => m.userId !== project.creatorId
    ).length;

    if (studentMemberCount >= project.maxMembers) {
      return NextResponse.json(
        { error: "ظرفیت پروژه تکمیل است" },
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
        source: "student_application",
      })
      .returning();

    return NextResponse.json({ application: app }, { status: 201 });
  } catch (error) {
    console.error("Application POST error:", error);

    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
