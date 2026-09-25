// src/app/api/projects/[id]/milestones/[milestoneId]/route.ts
// ه.۲ — Milestones، فاز ۲. ویرایش/تغییر وضعیت/حذف: فقط مالک پروژه.
// reachedAt به‌صورت خودکار روی لحظه‌ی تغییر وضعیت به reached ثبت می‌شود؛
// اگر به pending برگردد، reachedAt پاک می‌شود (چون دیگر واقعاً «رسیده»
// نیست).

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { projectMilestones } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { getProjectAccess } from "@/lib/projectAccess";
import {
  parseId,
  MILESTONE_TITLE_MIN,
  MILESTONE_TITLE_MAX,
  MILESTONE_DESCRIPTION_MAX,
  isValidMilestoneStatus,
} from "@/lib/validation";
import { auditLog } from "@/lib/auditLog";
import { logProjectActivity } from "@/lib/activityLog";

type Params = { params: Promise<{ id: string; milestoneId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: "احراز هویت نشده‌اید" },
        { status: 401 }
      );
    }

    const { id, milestoneId: milestoneIdParam } = await params;
    const projectId = parseId(id);
    const milestoneId = parseId(milestoneIdParam);
    if (projectId === null || milestoneId === null) {
      return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
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
        { error: "فقط مالک پروژه می‌تواند نقطه پیشرفت را ویرایش کند" },
        { status: 403 }
      );
    }

    const [milestone] = await db
      .select()
      .from(projectMilestones)
      .where(
        and(
          eq(projectMilestones.id, milestoneId),
          eq(projectMilestones.projectId, projectId)
        )
      );
    if (!milestone) {
      return NextResponse.json(
        { error: "نقطه پیشرفت یافت نشد" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const updates: Partial<typeof projectMilestones.$inferInsert> = {};

    if (body.title !== undefined) {
      const title = typeof body.title === "string" ? body.title.trim() : "";
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
      updates.title = title;
    }

    if (body.description !== undefined) {
      const description =
        typeof body.description === "string" ? body.description.trim() : "";
      if (description.length > MILESTONE_DESCRIPTION_MAX) {
        return NextResponse.json(
          { error: "توضیح بیش از حد طولانی است" },
          { status: 400 }
        );
      }
      updates.description = description || null;
    }

    if (body.status !== undefined) {
      if (!isValidMilestoneStatus(body.status)) {
        return NextResponse.json(
          { error: "وضعیت نامعتبر است" },
          { status: 400 }
        );
      }
      updates.status = body.status;
      // reachedAt فقط بازتاب همین لحظه است، نه چیزی که کلاینت بفرستد.
      updates.reachedAt = body.status === "reached" ? new Date() : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "هیچ تغییری ارسال نشده است" },
        { status: 400 }
      );
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(projectMilestones)
      .set(updates)
      .where(eq(projectMilestones.id, milestoneId))
      .returning();

    auditLog("milestone_updated", {
      milestoneId,
      projectId,
      actorId: authUser.userId,
      newStatus: updated.status,
    });

    if (updates.status !== undefined && updates.status !== milestone.status) {
      await logProjectActivity({
        projectId,
        actorId: authUser.userId,
        entityType: "milestone",
        entityId: milestoneId,
        entityTitle: updated.title,
        type:
          updates.status === "reached"
            ? "milestone_reached"
            : "milestone_reverted",
      });
    }

    return NextResponse.json({ milestone: updated });
  } catch (error) {
    console.error("Milestone PATCH error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: "احراز هویت نشده‌اید" },
        { status: 401 }
      );
    }

    const { id, milestoneId: milestoneIdParam } = await params;
    const projectId = parseId(id);
    const milestoneId = parseId(milestoneIdParam);
    if (projectId === null || milestoneId === null) {
      return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
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
        { error: "فقط مالک پروژه می‌تواند نقطه پیشرفت را حذف کند" },
        { status: 403 }
      );
    }

    const [milestone] = await db
      .select({ id: projectMilestones.id, title: projectMilestones.title })
      .from(projectMilestones)
      .where(
        and(
          eq(projectMilestones.id, milestoneId),
          eq(projectMilestones.projectId, projectId)
        )
      );
    if (!milestone) {
      return NextResponse.json(
        { error: "نقطه پیشرفت یافت نشد" },
        { status: 404 }
      );
    }

    await db
      .delete(projectMilestones)
      .where(eq(projectMilestones.id, milestoneId));

    auditLog("milestone_deleted", {
      milestoneId,
      projectId,
      actorId: authUser.userId,
    });
    await logProjectActivity({
      projectId,
      actorId: authUser.userId,
      entityType: "milestone",
      entityId: milestoneId,
      entityTitle: milestone.title,
      type: "milestone_deleted",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Milestone DELETE error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
