import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, users, applications, projectMembers } from "@/db/schema";
import { count, desc, eq, inArray, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { getAdminDepartments } from "@/lib/adminScope";

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

    // Faculty scope: only projects whose creator belongs to one of the
    // admin's departments. No departments => empty list, no projects query.
    const departments = await getAdminDepartments(admin.userId);
    if (departments.length === 0) {
      return NextResponse.json({ projects: [] });
    }

    const rows = await db
      .select({
        id: projects.id,
        title: projects.title,
        description: projects.description,
        status: projects.status,
        maxMembers: projects.maxMembers,
        deadline: projects.deadline,
        createdAt: projects.createdAt,
        professorName: users.name,
        professorEmail: users.email,
        professorDepartment: users.department,
        memberCount: sql<number>`(
          select count(*)::int from project_members pm
          where pm.project_id = ${projects.id}
            and pm.user_id <> ${projects.creatorId}
        )`,
        pendingApplications: sql<number>`(
          select count(*)::int from applications a
          where a.project_id = ${projects.id}
            and a.status = 'pending'
        )`,
      })
      .from(projects)
      .innerJoin(users, eq(projects.creatorId, users.id))
      .where(inArray(users.department, departments))
      .orderBy(desc(projects.createdAt));

    return NextResponse.json({ projects: rows });
  } catch (error) {
    console.error("Admin projects error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
