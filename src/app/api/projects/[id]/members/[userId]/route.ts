import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, projectMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });
    const { id, userId } = await params;
    const projectId = Number(id), targetId = Number(userId);
    if (!Number.isInteger(projectId) || !Number.isInteger(targetId) || projectId <= 0 || targetId <= 0) return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
    const [project] = await db.select({ creatorId: projects.creatorId }).from(projects).where(eq(projects.id, projectId));
    if (!project) return NextResponse.json({ error: "پروژه یافت نشد" }, { status: 404 });
    if (project.creatorId !== auth.userId) return NextResponse.json({ error: "دسترسی مجاز نیست" }, { status: 403 });
    if (targetId === project.creatorId) return NextResponse.json({ error: "سازنده پروژه قابل حذف نیست" }, { status: 400 });
    await db.delete(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, targetId)));
    return NextResponse.json({ message: "عضو از پروژه حذف شد" });
  } catch (error) {
    console.error("Member DELETE error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
