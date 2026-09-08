import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects, projectMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";

type Params = { params: Promise<{ token: string }> };

export async function POST(_req: Request, { params }: Params) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "ابتدا وارد حساب شوید" }, { status: 401 });
    if (auth.role !== "student") return NextResponse.json({ error: "فقط دانشجو می‌تواند از لینک دعوت استفاده کند" }, { status: 403 });
    const token = (await params).token;
    const [project] = await db.select().from(projects).where(and(eq(projects.inviteToken, token), eq(projects.visibility, "private")));
    if (!project) return NextResponse.json({ error: "لینک دعوت نامعتبر یا غیرفعال است" }, { status: 404 });
    const [member] = await db.select().from(projectMembers).where(and(eq(projectMembers.projectId, project.id), eq(projectMembers.userId, auth.userId)));
    if (member) return NextResponse.json({ message: "شما از قبل عضو پروژه هستید", projectId: project.id });
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(projectMembers).where(and(eq(projectMembers.projectId, project.id), sql`${projectMembers.userId} <> ${project.creatorId}`));
    if (count >= project.maxMembers) return NextResponse.json({ error: "ظرفیت پروژه تکمیل است" }, { status: 409 });
    await db.insert(projectMembers).values({ projectId: project.id, userId: auth.userId });
    if (project.status === "open") await db.update(projects).set({ status: "in_progress", updatedAt: new Date() }).where(eq(projects.id, project.id));
    return NextResponse.json({ message: "با موفقیت به پروژه پیوستید", projectId: project.id });
  } catch (error) {
    console.error("Invite token error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
