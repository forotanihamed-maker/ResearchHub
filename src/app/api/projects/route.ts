import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { projects, users, applications, projectMembers } from "@/db/schema";
import { eq, inArray, desc, and, or, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import {
  sanitizeTitle, sanitizeDescription, parseMaxMembers, parseDeadline,
  isValidProjectType, isValidProjectVisibility, TITLE_MIN, TITLE_MAX,
  DESCRIPTION_MIN, DESCRIPTION_MAX,
} from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) return NextResponse.json({ error: "احراز هویت نشده‌اید" }, { status: 401 });
    if (authUser.role === "admin") return NextResponse.json({ error: "دسترسی مدیر فقط از طریق پنل مدیریت امکان‌پذیر است" }, { status: 403 });
    const sp = new URL(req.url).searchParams;
    const status = sp.get("status");
    const search = sp.get("search");
    const chatOnly = sp.get("chat") === "true";
    const myOnly = sp.get("my") === "true";
    const conditions: any[] = [];

    if (myOnly) {
      conditions.push(eq(projects.creatorId, authUser.userId));
    } else if (chatOnly) {
      const rows = await db.select({ projectId: projectMembers.projectId }).from(projectMembers).where(eq(projectMembers.userId, authUser.userId));
      const ids = rows.map(r => r.projectId);
      if (!ids.length) return NextResponse.json({ projects: [] });
      conditions.push(inArray(projects.id, ids));
    } else if (authUser.role === "student") {
      const memberships = await db.select({ projectId: projectMembers.projectId }).from(projectMembers).where(eq(projectMembers.userId, authUser.userId));
      const ids = memberships.map(r => r.projectId);
      conditions.push(ids.length ? or(and(eq(projects.visibility, "public"), eq(projects.status, "open")), inArray(projects.id, ids)) : and(eq(projects.visibility, "public"), eq(projects.status, "open")));
    } else if (authUser.role === "professor") {
      conditions.push(eq(projects.creatorId, authUser.userId));
    }

    if (status && status !== "all" && ["open","in_progress","completed"].includes(status)) conditions.push(eq(projects.status, status as any));
    const whereClause = conditions.length ? and(...conditions) : undefined;
    const rows = await db.select({
      id: projects.id, title: projects.title, description: projects.description, status: projects.status, type: projects.type,
      creatorId: projects.creatorId, creatorRole: projects.creatorRole, visibility: projects.visibility, professorId: projects.professorId,
      maxMembers: projects.maxMembers, deadline: projects.deadline, createdAt: projects.createdAt, updatedAt: projects.updatedAt,
      professorName: users.name, professorDepartment: users.department, professorUniversity: users.university,
    }).from(projects).innerJoin(users, eq(projects.creatorId, users.id)).where(whereClause).orderBy(desc(projects.createdAt));

    const ids = rows.map(p => p.id);
    const memberRows = ids.length ? await db.select({ projectId: projectMembers.projectId, userId: projectMembers.userId }).from(projectMembers).where(inArray(projectMembers.projectId, ids)) : [];
    const creatorByProject = new Map(rows.map(p => [p.id, p.creatorId]));
    const counts = new Map<number, number>();
    for (const m of memberRows) if (m.userId !== creatorByProject.get(m.projectId)) counts.set(m.projectId, (counts.get(m.projectId) ?? 0) + 1);
    const appRows = ids.length ? await db.select({ projectId: applications.projectId, count: sql<number>`count(*)::int` }).from(applications).where(and(inArray(applications.projectId, ids), eq(applications.status, "pending"))).groupBy(applications.projectId) : [];
    const appCounts = new Map(appRows.map(a => [a.projectId, a.count]));
    let result = rows.map(p => ({ ...p, memberCount: counts.get(p.id) ?? 0, pendingApplications: appCounts.get(p.id) ?? 0 }));
    if (search) { const q = search.toLowerCase(); result = result.filter(p => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.professorName.toLowerCase().includes(q)); }
    return NextResponse.json({ projects: result });
  } catch (error) { console.error("Projects GET error:", error); return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !["professor","student"].includes(authUser.role)) return NextResponse.json({ error: "فقط استاد یا دانشجو می‌تواند پروژه بسازد" }, { status: 403 });
    const body = await req.json();
    const title = sanitizeTitle(body.title); if (!title) return NextResponse.json({ error: `عنوان باید بین ${TITLE_MIN} تا ${TITLE_MAX} کاراکتر باشد` }, { status: 400 });
    const description = sanitizeDescription(body.description); if (!description) return NextResponse.json({ error: `توضیحات باید بین ${DESCRIPTION_MIN} تا ${DESCRIPTION_MAX} کاراکتر باشد` }, { status: 400 });
    const type = body.type ?? (authUser.role === "student" ? "course" : "research");
    if (!isValidProjectType(type)) return NextResponse.json({ error: "نوع پروژه نامعتبر است" }, { status: 400 });
    const visibility = body.visibility ?? "public";
    if (!isValidProjectVisibility(visibility)) return NextResponse.json({ error: "نوع دسترسی پروژه نامعتبر است" }, { status: 400 });
    const maxMembers = body.maxMembers === undefined ? 5 : parseMaxMembers(body.maxMembers);
    if (maxMembers === null) return NextResponse.json({ error: "حداکثر تعداد اعضا باید یک عدد صحیح مثبت باشد" }, { status: 400 });
    const deadline = parseDeadline(body.deadline); if (!deadline.ok) return NextResponse.json({ error: "تاریخ مهلت نامعتبر است" }, { status: 400 });
    const [project] = await db.insert(projects).values({ title, description, status: "open", type, creatorId: authUser.userId, creatorRole: authUser.role as "professor" | "student", professorId: authUser.role === "professor" ? authUser.userId : null, visibility, inviteToken: visibility === "private" ? crypto.randomBytes(32).toString("hex") : null, maxMembers, deadline: deadline.value }).returning();
    await db.insert(projectMembers).values({ projectId: project.id, userId: authUser.userId });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) { console.error("Projects POST error:", error); return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 }); }
}
