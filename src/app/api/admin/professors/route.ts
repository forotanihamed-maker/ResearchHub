/*src\app\api\admin\professors\route.ts */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminDepartments, users } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { auditLog } from "@/lib/auditLog";
import { isValidProfessorStatus } from "@/lib/validation";

async function getAdminDepartments(adminId: number) {
  const rows = await db
    .select({ department: adminDepartments.department })
    .from(adminDepartments)
    .where(eq(adminDepartments.adminId, adminId));
  return rows.map((row) => row.department);
}

export async function GET() {
  const admin = await getAuthUser();
  if (!admin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const departments = await getAdminDepartments(admin.userId);
  if (departments.length === 0) return NextResponse.json({ professors: [] });

  const professors = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      department: users.department,
      professorStatus: users.professorStatus,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(
      and(eq(users.role, "professor"), inArray(users.department, departments))
    )
    .orderBy(users.createdAt);

  return NextResponse.json({ professors });
}

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Professors must register themselves; administrators approve or reject registrations.",
    },
    { status: 403 }
  );
}

export async function PATCH(req: NextRequest) {
  const admin = await getAuthUser();
  if (!admin)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (admin.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const professorId = Number(body.id);
    const status = body.status;
    if (
      !Number.isInteger(professorId) ||
      professorId <= 0 ||
      !isValidProfessorStatus(status)
    ) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const departments = await getAdminDepartments(admin.userId);
    const [professor] = await db
      .select({ id: users.id, department: users.department, role: users.role })
      .from(users)
      .where(eq(users.id, professorId));

    if (
      !professor ||
      professor.role !== "professor" ||
      !departments.includes(professor.department)
    ) {
      return NextResponse.json(
        { error: "Professor is outside your department scope" },
        { status: 403 }
      );
    }

    const [updated] = await db
      .update(users)
      .set({ professorStatus: status, updatedAt: new Date() })
      .where(eq(users.id, professorId))
      .returning({ id: users.id, professorStatus: users.professorStatus });

    auditLog("professor_status_changed", {
      adminId: admin.userId,
      professorId,
      status,
    });
    return NextResponse.json({ professor: updated });
  } catch (error) {
    console.error("Professor status update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
