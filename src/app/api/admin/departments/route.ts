/*src\app\api\admin\departmens\route.ts */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminDepartments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { DEPARTMENTS, isValidDepartment } from "@/lib/validation";

export async function GET() {
  const admin = await getAuthUser();
  if (!admin)
    return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });
  if (admin.role !== "admin")
    return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 });

  const rows = await db
    .select({ department: adminDepartments.department })
    .from(adminDepartments)
    .where(eq(adminDepartments.adminId, admin.userId));

  return NextResponse.json({
    departments: DEPARTMENTS,
    selected: rows.map((row) => row.department),
  });
}

export async function PATCH(req: NextRequest) {
  const admin = await getAuthUser();
  if (!admin)
    return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });
  if (admin.role !== "admin")
    return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 });

  try {
    const body = await req.json();
    const departments = Array.isArray(body.departments)
      ? [...new Set(body.departments)]
      : null;
    if (
      !departments ||
      departments.length === 0 ||
      !departments.every(isValidDepartment)
    ) {
      return NextResponse.json(
        { error: "حداقل یک گروه آموزشی معتبر انتخاب کنید" },
        { status: 400 }
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(adminDepartments)
        .where(eq(adminDepartments.adminId, admin.userId));
      await tx.insert(adminDepartments).values(
        departments.map((department) => ({
          adminId: admin.userId,
          department,
        }))
      );
    });

    return NextResponse.json({ selected: departments });
  } catch (error) {
    console.error("Admin departments update error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
