// src/app/api/projects/[id]/overview/route.ts
// ه.۴ — Overview، فاز ۴. فقط دو Query تجمیعی؛ deadline از project موجود در
// کلاینت تأمین می‌شود و activity از همان endpoint/queryKey فعلی — هیچ‌کدام
// اینجا محاسبه نمی‌شود.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, projectMilestones } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
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

    const [taskCounts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        todo: sql<number>`count(*) filter (where ${tasks.status} = 'todo')::int`,
        inProgress: sql<number>`count(*) filter (where ${tasks.status} = 'in_progress')::int`,
        done: sql<number>`count(*) filter (where ${tasks.status} = 'done')::int`,
        overdue: sql<number>`count(*) filter (where ${tasks.dueDate} < now() and ${tasks.status} != 'done')::int`,
      })
      .from(tasks)
      .where(eq(tasks.projectId, projectId));

    const [latest] = await db
      .select({
        id: projectMilestones.id,
        title: projectMilestones.title,
        reachedAt: projectMilestones.reachedAt,
      })
      .from(projectMilestones)
      .where(
        and(
          eq(projectMilestones.projectId, projectId),
          eq(projectMilestones.status, "reached")
        )
      )
      .orderBy(desc(projectMilestones.reachedAt))
      .limit(1);

    // فاز ۵ — شمارش کلی Milestone (کل/رسیده)؛ «باقی‌مانده» در پاسخ محاسبه
    // می‌شود، نه در Query.
    const [milestoneCounts] = await db
      .select({
        total: sql<number>`count(*)::int`,
        reached: sql<number>`count(*) filter (where ${projectMilestones.status} = 'reached')::int`,
      })
      .from(projectMilestones)
      .where(eq(projectMilestones.projectId, projectId));

    return NextResponse.json({
      tasks: {
        total: taskCounts?.total ?? 0,
        todo: taskCounts?.todo ?? 0,
        inProgress: taskCounts?.inProgress ?? 0,
        done: taskCounts?.done ?? 0,
        overdue: taskCounts?.overdue ?? 0,
      },
      milestones: {
        total: milestoneCounts?.total ?? 0,
        reached: milestoneCounts?.reached ?? 0,
        remaining:
          (milestoneCounts?.total ?? 0) - (milestoneCounts?.reached ?? 0),
      },
      latestMilestone: latest ?? null,
    });
  } catch (error) {
    console.error("Overview GET error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
