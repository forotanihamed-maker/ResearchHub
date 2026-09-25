// src/app/api/projects/[id]/milestones/route.ts
// ه.۲ — Milestones، فاز ۲. مشاهده برای همه‌ی اعضا؛ ایجاد فقط برای مالک
// پروژه (تصمیم محصول — برخلاف Task).

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projectMilestones, users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/projectAccess";
import {
  parseId,
  MILESTONE_TITLE_MIN,
  MILESTONE_TITLE_MAX,
  MILESTONE_DESCRIPTION_MAX,
} from "@/lib/validation";
import { auditLog } from "@/lib/auditLog";
import { logProjectActivity } from "@/lib/activityLog";

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

    // ترتیب نمایش: ترتیب ایجاد (createdAt) — بدون فیلد order جداگانه.
    const rows = await db
      .select({
        id: projectMilestones.id,
        projectId: projectMilestones.projectId,
        title: projectMilestones.title,
        description: projectMilestones.description,
        status: projectMilestones.status,
        reachedAt: projectMilestones.reachedAt,
        createdAt: projectMilestones.createdAt,
        updatedAt: projectMilestones.updatedAt,
        createdBy: projectMilestones.createdBy,
        createdByName: users.name,
      })
      .from(projectMilestones)
      .innerJoin(users, eq(projectMilestones.createdBy, users.id))
      .where(eq(projectMilestones.projectId, projectId))
      .orderBy(asc(projectMilestones.createdAt));

    return NextResponse.json({ milestones: rows });
  } catch (error) {
    console.error("Milestones GET error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
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

    const { project, isOwner } = await getProjectAccess(
      projectId,
      authUser.userId
    );
    if (!project) {
      return NextResponse.json({ error: "پروژه یافت نشد" }, { status: 404 });
    }
    if (!isOwner) {
      return NextResponse.json(
        { error: "فقط مالک پروژه می‌تواند نقطه پیشرفت ایجاد کند" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";

    if (
      title.length < MILESTONE_TITLE_MIN ||
      title.length > MILESTONE_TITLE_MAX
    ) {
      return NextResponse.json(
        {
          error: `عنوان باید بین ${MILESTONE_TITLE_MIN} تا ${MILESTONE_TITLE_MAX} کاراکتر باشد`,
        },
        { status: 400 }
      );
    }
    if (description.length > MILESTONE_DESCRIPTION_MAX) {
      return NextResponse.json(
        { error: "توضیح بیش از حد طولانی است" },
        { status: 400 }
      );
    }

    const [milestone] = await db
      .insert(projectMilestones)
      .values({
        projectId,
        title,
        description: description || null,
        createdBy: authUser.userId,
      })
      .returning();

    auditLog("milestone_created", {
      milestoneId: milestone.id,
      projectId,
      actorId: authUser.userId,
    });
    await logProjectActivity({
      projectId,
      actorId: authUser.userId,
      entityType: "milestone",
      entityId: milestone.id,
      entityTitle: milestone.title,
      type: "milestone_created",
    });

    const [creator] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, authUser.userId));

    return NextResponse.json(
      { milestone: { ...milestone, createdByName: creator?.name ?? "" } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Milestones POST error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
