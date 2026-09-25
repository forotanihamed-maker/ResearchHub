// src/app/api/projects/[id]/activity/route.ts
// ه.۳ — Activity، فاز ۳. فقط خواندن؛ برای همه‌ی اعضای پروژه. جدیدترین
// اول، محدود به ۳۰ مورد آخر (بدون Pagination در این نسخه).

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projectActivity, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/projectAccess";
import { parseId } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: "احراز هویت نشده‌اید" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const projectId = parseId(id);
    if (projectId === null) {
      return NextResponse.json(
        { error: "شناسه پروژه نامعتبر است" },
        { status: 400 }
      );
    }

    const { project, isMember } = await getProjectAccess(
      projectId,
      authUser.userId
    );
    if (!project) {
      return NextResponse.json({ error: "پروژه یافت نشد" }, { status: 404 });
    }
    if (!isMember) {
      return NextResponse.json({ error: "دسترسی رد شد" }, { status: 403 });
    }

    const rows = await db
      .select({
        id: projectActivity.id,
        type: projectActivity.type,
        entityType: projectActivity.entityType,
        entityTitle: projectActivity.entityTitle,
        detail: projectActivity.detail,
        actorName: users.name,
        createdAt: projectActivity.createdAt,
      })
      .from(projectActivity)
      .innerJoin(users, eq(projectActivity.actorId, users.id))
      .where(eq(projectActivity.projectId, projectId))
      .orderBy(desc(projectActivity.createdAt))
      .limit(30);

    return NextResponse.json({ activity: rows });
  } catch (error) {
    console.error("Activity GET error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
