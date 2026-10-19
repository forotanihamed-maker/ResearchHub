/*src\app\api\admin\departmens\route.ts */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { adminDepartments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { DEPARTMENTS } from "@/lib/validation";

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

// Stage 3: admins can no longer change their own departments. Assigning
// departments is an owner-only operation done directly in the database
// (scripts/set-admin-departments.sql). This handler deliberately does not read
// the body and never touches the database.
export async function PATCH() {
  const admin = await getAuthUser();
  if (!admin)
    return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });
  if (admin.role !== "admin")
    return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 });

  return NextResponse.json(
    { error: "تعیین گروه‌های آموزشی فقط توسط مالک سامانه انجام می‌شود." },
    { status: 403 }
  );
}
