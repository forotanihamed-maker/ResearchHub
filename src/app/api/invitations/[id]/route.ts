import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applications, projects, projectMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });
    const appId = Number((await params).id);
    if (!Number.isInteger(appId) || appId <= 0) return NextResponse.json({ error: "شناسه دعوت نامعتبر است" }, { status: 400 });
    const { status } = await req.json();
    if (status !== "approved" && status !== "rejected") return NextResponse.json({ error: "وضعیت نامعتبر است" }, { status: 400 });
    const [app] = await db.select().from(applications).where(and(eq(applications.id, appId), eq(applications.studentId, auth.userId), eq(applications.source, "owner_invite")));
    if (!app) return NextResponse.json({ error: "دعوت یافت نشد" }, { status: 404 });
    if (app.status !== "pending") return NextResponse.json({ error: "این دعوت دیگر در انتظار نیست" }, { status: 409 });
    if (status === "rejected") {
      await db.update(applications).set({ status: "rejected", updatedAt: new Date() }).where(eq(applications.id, appId));
      return NextResponse.json({ message: "دعوت رد شد" });
    }
    await db.transaction(async (tx) => {
      const [project] = await tx.select().from(projects).where(eq(projects.id, app.projectId)).for("update");
      if (!project) throw new Error("NOT_FOUND");
      const [member] = await tx.select().from(projectMembers).where(and(eq(projectMembers.projectId, app.projectId), eq(projectMembers.userId, auth.userId)));
      if (!member) {
        const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(projectMembers).where(and(eq(projectMembers.projectId, app.projectId), sql`${projectMembers.userId} <> ${project.creatorId}`));
        if (count >= project.maxMembers) throw new Error("PROJECT_FULL");
        await tx.insert(projectMembers).values({ projectId: app.projectId, userId: auth.userId });
      }
      await tx.update(applications).set({ status: "approved", updatedAt: new Date() }).where(eq(applications.id, appId));
      if (project.status === "open") await tx.update(projects).set({ status: "in_progress", updatedAt: new Date() }).where(eq(projects.id, app.projectId));
    });
    return NextResponse.json({ message: "دعوت پذیرفته شد", projectId: app.projectId });
  } catch (error) {
    if (error instanceof Error && error.message === "PROJECT_FULL") return NextResponse.json({ error: "ظرفیت پروژه تکمیل است" }, { status: 409 });
    console.error("Invitation PATCH error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
