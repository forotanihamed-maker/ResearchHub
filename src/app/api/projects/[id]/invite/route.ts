import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projects, users, applications, projectMembers } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { parseId, isValidUsername } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });
    const projectId = parseId((await params).id);
    if (projectId === null) return NextResponse.json({ error: "شناسه پروژه نامعتبر است" }, { status: 400 });
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) return NextResponse.json({ error: "پروژه یافت نشد" }, { status: 404 });
    if (project.creatorId !== auth.userId) return NextResponse.json({ error: "فقط سازنده پروژه می‌تواند دعوت کند" }, { status: 403 });
    const body = await req.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    if (!isValidUsername(username)) return NextResponse.json({ error: "نام کاربری نامعتبر است" }, { status: 400 });
    const [target] = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(eq(users.username, username));
    if (!target) return NextResponse.json({ error: "کاربری با این نام کاربری پیدا نشد" }, { status: 404 });
    if (target.id === auth.userId) return NextResponse.json({ error: "نمی‌توانید خودتان را دعوت کنید" }, { status: 400 });
    if (target.role !== "student") return NextResponse.json({ error: "فقط دانشجویان می‌توانند عضو این پروژه شوند" }, { status: 400 });
    const [member] = await db.select().from(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, target.id)));
    if (member) return NextResponse.json({ error: "این کاربر از قبل عضو پروژه است" }, { status: 409 });
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(projectMembers).where(and(eq(projectMembers.projectId, projectId), sql`${projectMembers.userId} <> ${project.creatorId}`));
    if (count >= project.maxMembers) return NextResponse.json({ error: "ظرفیت پروژه تکمیل است" }, { status: 409 });
    const [pending] = await db.select().from(applications).where(and(eq(applications.projectId, projectId), eq(applications.studentId, target.id), eq(applications.status, "pending")));
    if (pending) return NextResponse.json({ error: "برای این کاربر قبلاً دعوت یا درخواست در انتظار وجود دارد" }, { status: 409 });
    const [app] = await db.insert(applications).values({ projectId, studentId: target.id, status: "pending", source: "owner_invite", message: null }).returning();
    return NextResponse.json({ application: app, message: `دعوت برای ${target.name} ارسال شد` }, { status: 201 });
  } catch (error) {
    console.error("Project invite error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
