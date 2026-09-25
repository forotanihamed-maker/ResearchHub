// src/app/api/projects/[id]/tasks/[taskId]/route.ts
// ه.۱ — Tasks، فاز ۱. ویرایش وضعیت/جزئیات: مسئول کار یا مالک پروژه. تغییر
// مسئول: فقط مالک پروژه. حذف: فقط مالک پروژه (Hard Delete).

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/auth";
import { getProjectAccess, isProjectParticipant } from "@/lib/projectAccess";
import {
  parseId,
  TASK_TITLE_MIN,
  TASK_TITLE_MAX,
  TASK_DESCRIPTION_MAX,
  isValidTaskStatus,
  isValidTaskPriority,
} from "@/lib/validation";
import { auditLog } from "@/lib/auditLog";
import { logProjectActivity } from "@/lib/activityLog";

// برچسب فارسی وضعیت — فقط برای متن نمایشی «فعالیت‌های اخیر» (detail).
const TASK_STATUS_LABEL_FA: Record<string, string> = {
  todo: "انجام‌نشده",
  in_progress: "در حال انجام",
  done: "انجام‌شده",
};

type Params = { params: Promise<{ id: string; taskId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        { error: "احراز هویت نشده‌اید" },
        { status: 401 }
      );
    }

    const { id, taskId: taskIdParam } = await params;
    const projectId = parseId(id);
    const taskId = parseId(taskIdParam);
    if (projectId === null || taskId === null) {
      return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
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

    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)));
    if (!task) {
      return NextResponse.json({ error: "کار یافت نشد" }, { status: 404 });
    }

    const isOwner = project.creatorId === authUser.userId;
    const isAssignee = task.assigneeId === authUser.userId;

    if (!isOwner && !isAssignee) {
      return NextResponse.json(
        { error: "فقط مسئول کار یا مالک پروژه می‌تواند آن را ویرایش کند" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updates: Partial<typeof tasks.$inferInsert> = {};

    if (body.title !== undefined) {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (title.length < TASK_TITLE_MIN || title.length > TASK_TITLE_MAX) {
        return NextResponse.json(
          {
            error: `عنوان کار باید بین ${TASK_TITLE_MIN} تا ${TASK_TITLE_MAX} کاراکتر باشد`,
          },
          { status: 400 }
        );
      }
      updates.title = title;
    }

    if (body.description !== undefined) {
      const description =
        typeof body.description === "string" ? body.description.trim() : "";
      if (description.length > TASK_DESCRIPTION_MAX) {
        return NextResponse.json(
          { error: "توضیح کار بیش از حد طولانی است" },
          { status: 400 }
        );
      }
      updates.description = description || null;
    }

    if (body.status !== undefined) {
      if (!isValidTaskStatus(body.status)) {
        return NextResponse.json(
          { error: "وضعیت نامعتبر است" },
          { status: 400 }
        );
      }
      updates.status = body.status;
    }

    if (body.priority !== undefined) {
      if (!isValidTaskPriority(body.priority)) {
        return NextResponse.json(
          { error: "اولویت نامعتبر است" },
          { status: 400 }
        );
      }
      updates.priority = body.priority;
    }

    if (body.startDate !== undefined) {
      if (body.startDate === null) {
        updates.startDate = null;
      } else {
        const d = new Date(body.startDate);
        if (isNaN(d.getTime())) {
          return NextResponse.json(
            { error: "تاریخ شروع نامعتبر است" },
            { status: 400 }
          );
        }
        updates.startDate = d;
      }
    }

    if (body.dueDate !== undefined) {
      if (body.dueDate === null) {
        updates.dueDate = null;
      } else {
        const d = new Date(body.dueDate);
        if (isNaN(d.getTime())) {
          return NextResponse.json(
            { error: "مهلت نامعتبر است" },
            { status: 400 }
          );
        }
        updates.dueDate = d;
      }
    }

    const nextStart =
      updates.startDate !== undefined ? updates.startDate : task.startDate;
    const nextDue =
      updates.dueDate !== undefined ? updates.dueDate : task.dueDate;
    if (nextStart && nextDue && nextDue < nextStart) {
      return NextResponse.json(
        { error: "مهلت نمی‌تواند قبل از تاریخ شروع باشد" },
        { status: 400 }
      );
    }

    // تغییر مسئول: فقط مالک پروژه (تصمیم محصول — جدا از ویرایش جزئیات).
    if (body.assigneeId !== undefined) {
      if (!isOwner) {
        return NextResponse.json(
          { error: "فقط مالک پروژه می‌تواند مسئول کار را تغییر دهد" },
          { status: 403 }
        );
      }
      if (body.assigneeId === null) {
        updates.assigneeId = null;
      } else {
        const candidate = Number(body.assigneeId);
        if (!Number.isInteger(candidate) || candidate <= 0) {
          return NextResponse.json(
            { error: "مسئول نامعتبر است" },
            { status: 400 }
          );
        }
        const participant = await isProjectParticipant(
          projectId,
          candidate,
          project.creatorId
        );
        if (!participant) {
          return NextResponse.json(
            { error: "مسئول باید عضو همین پروژه باشد" },
            { status: 400 }
          );
        }
        updates.assigneeId = candidate;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "هیچ تغییری ارسال نشده است" },
        { status: 400 }
      );
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, taskId))
      .returning();

    auditLog("task_updated", {
      taskId,
      projectId,
      actorId: authUser.userId,
    });

    if (updates.status !== undefined && updates.status !== task.status) {
      await logProjectActivity({
        projectId,
        actorId: authUser.userId,
        entityType: "task",
        entityId: taskId,
        entityTitle: updated.title,
        type: "task_status_changed",
        detail: TASK_STATUS_LABEL_FA[updated.status] ?? updated.status,
      });
    }

    if (
      updates.assigneeId !== undefined &&
      updates.assigneeId !== task.assigneeId
    ) {
      let assigneeName = "بدون مسئول";
      if (updates.assigneeId !== null) {
        const [assignee] = await db
          .select({ name: users.name })
          .from(users)
          .where(eq(users.id, updates.assigneeId));
        assigneeName = assignee?.name ?? "بدون مسئول";
      }
      await logProjectActivity({
        projectId,
        actorId: authUser.userId,
        entityType: "task",
        entityId: taskId,
        entityTitle: updated.title,
        type: "task_reassigned",
        detail: assigneeName,
      });
    }

    return NextResponse.json({ task: updated });
  } catch (error) {
    console.error("Task PATCH error:", error);
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

    const { id, taskId: taskIdParam } = await params;
    const projectId = parseId(id);
    const taskId = parseId(taskIdParam);
    if (projectId === null || taskId === null) {
      return NextResponse.json({ error: "شناسه نامعتبر است" }, { status: 400 });
    }

    const { project } = await getProjectAccess(projectId, authUser.userId);
    if (!project) {
      return NextResponse.json({ error: "پروژه یافت نشد" }, { status: 404 });
    }
    if (project.creatorId !== authUser.userId) {
      return NextResponse.json(
        { error: "فقط مالک پروژه می‌تواند کار را حذف کند" },
        { status: 403 }
      );
    }

    const [task] = await db
      .select({ id: tasks.id, title: tasks.title })
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId)));
    if (!task) {
      return NextResponse.json({ error: "کار یافت نشد" }, { status: 404 });
    }

    await db.delete(tasks).where(eq(tasks.id, taskId));

    auditLog("task_deleted", {
      taskId,
      projectId,
      actorId: authUser.userId,
    });
    await logProjectActivity({
      projectId,
      actorId: authUser.userId,
      entityType: "task",
      entityId: taskId,
      entityTitle: task.title,
      type: "task_deleted",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Task DELETE error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
