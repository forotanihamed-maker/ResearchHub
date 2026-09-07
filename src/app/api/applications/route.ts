//src/app/api/applications/route.ts
/*src\app\api\applications/route.ts*/
import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications, projects, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: "احراز هویت نشده‌اید" },
        { status: 401 }
      );
    }

    if (authUser.role !== "student") {
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
        projectTitle: projects.title,
        projectDescription: projects.description,
        projectStatus: projects.status,
        professorName: users.name,
        professorDepartment: users.department,
      })
      .from(applications)
      .innerJoin(projects, eq(applications.projectId, projects.id))
      .innerJoin(users, eq(projects.professorId, users.id))
      .where(eq(applications.studentId, authUser.userId))
      .orderBy(desc(applications.createdAt));

    return NextResponse.json({ applications: apps });
  } catch (error) {
    console.error("My applications error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
