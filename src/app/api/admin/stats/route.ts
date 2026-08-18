/*src\app\api\admin\stats\route.ts */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, projects } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const students = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.role, "student"));

  const professors = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.role, "professor"));

  const projectCount = await db.select({ count: count() }).from(projects);

  return NextResponse.json({
    students: students[0].count,
    professors: professors[0].count,
    projects: projectCount[0].count,
  });
}
