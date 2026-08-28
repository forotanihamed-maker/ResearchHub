import { NextResponse } from "next/server";
import { db } from "@/db";
import { adminDepartments, users, projects } from "@/db/schema";
import { and, count, eq, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const admin = await getAuthUser();
  if (!admin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const scopeRows = await db
    .select({ department: adminDepartments.department })
    .from(adminDepartments)
    .where(eq(adminDepartments.adminId, admin.userId));
  const departments = scopeRows.map((row) => row.department);

  if (departments.length === 0) {
    return NextResponse.json({
      students: 0,
      professors: 0,
      projects: 0,
      departments: [],
    });
  }

  const studentRows = await db
    .select({ count: count() })
    .from(users)
    .where(
      and(eq(users.role, "student"), inArray(users.department, departments))
    );

  const professorRows = await db
    .select({ count: count() })
    .from(users)
    .where(
      and(eq(users.role, "professor"), inArray(users.department, departments))
    );

  // Projects are intentionally university-wide for admin supervision.
  // User counts remain scoped to the admin's assigned departments.
  const projectRows = await db.select({ count: count() }).from(projects);

  return NextResponse.json({
    students: Number(studentRows[0]?.count ?? 0),
    professors: Number(professorRows[0]?.count ?? 0),
    projects: Number(projectRows[0]?.count ?? 0),
    departments,
  });
}
