import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, users, applications, projectMembers } from "@/db/schema";
import { count, desc, eq, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await getAuthUser();
    if (!admin)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (admin.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
            and pm.user_id <> ${projects.professorId}
        )`,
        pendingApplications: sql<number>`(
          select count(*)::int from applications a
          where a.project_id = ${projects.id}
            and a.status = 'pending'
        )`,
      })
      .from(projects)
      .innerJoin(users, eq(projects.professorId, users.id))
      .orderBy(desc(projects.createdAt));

    return NextResponse.json({ projects: rows });
  } catch (error) {
    console.error("Admin projects error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
