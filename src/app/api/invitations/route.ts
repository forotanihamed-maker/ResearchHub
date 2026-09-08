import { NextResponse } from "next/server";
import { db } from "@/db";
import { applications, projects, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });
    const invitations = await db.select({ id: applications.id, projectId: applications.projectId, status: applications.status, createdAt: applications.createdAt, projectTitle: projects.title, creatorName: users.name }).from(applications).innerJoin(projects, eq(applications.projectId, projects.id)).innerJoin(users, eq(projects.creatorId, users.id)).where(and(eq(applications.studentId, auth.userId), eq(applications.source, "owner_invite"))).orderBy(desc(applications.createdAt));
    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("Invitations GET error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
