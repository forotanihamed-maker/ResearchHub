// src/app/api/projects/[id]/tasks/route.ts
// ه.۱ — Tasks، فاز ۱. هر عضو پروژه می‌تواند کار ببیند و بسازد (طبق تصمیم
// محصول). ویرایش/حذف/تغییر مسئول در route جداگانه‌ی [taskId] کنترل می‌شود.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getAuthUser } from "@/lib/auth";
import { getProjectAccess, isProjectParticipant } from "@/lib/projectAccess";
import {
  parseId,
  TASK_TITLE_MIN,
  TASK_TITLE_MAX,
  TASK_DESCRIPTION_MAX,
  isValidTaskPriority,
} from "@/lib/validation";
import { auditLog } from "@/lib/auditLog";
import { logProjectActivity } from "@/lib/activityLog";

type Params = { params: Promise<{ id: string }> };

const creatorUsers = alias(users, "task_creator_users");
const assigneeUsers = alias(users, "task_assignee_users");

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

    // نزدیک‌ترین مهلت اول؛ بدون مهلت آخر؛ در تساوی، قدیمی‌ترین اول.
    const rows = await db
      .select({
        id: tasks.id,
        projectId: tasks.projectId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        startDate: tasks.startDate,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        creatorId: tasks.creatorId,
        creatorName: creatorUsers.name,
        assigneeId: tasks.assigneeId,
        assigneeName: assigneeUsers.name,
      })
      .from(tasks)
      .innerJoin(creatorUsers, eq(tasks.creatorId, creatorUsers.id))
      .leftJoin(assigneeUsers, eq(tasks.assigneeId, assigneeUsers.id))
      .where(eq(tasks.projectId, projectId))
      .orderBy(
        sql`${tasks.dueDate} IS NULL`,
        asc(tasks.dueDate),
        asc(tasks.createdAt)
      );

    return NextResponse.json({ tasks: rows });
  } catch (error) {
    console.error("Tasks GET error:", error);
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

    const { project, isMember } = await getProjectAccess(
      projectId,
      authUser.userId
    );
    if (!project) {
      return NextResponse.json({ error: "پروژه یافت نشد" }, { status: 404 });
    }
    // هر عضو پروژه (شامل مالک) می‌تواند Task بسازد.
    if (!isMember) {
      return NextResponse.json({ error: "دسترسی رد شد" }, { status: 403 });
    }

    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";

    if (title.length < TASK_TITLE_MIN || title.length > TASK_TITLE_MAX) {
      return NextResponse.json(
        {
          error: `عنوان کار باید بین ${TASK_TITLE_MIN} تا ${TASK_TITLE_MAX} کاراکتر باشد`,
        },
        { status: 400 }
      );
    }
    if (description.length > TASK_DESCRIPTION_MAX) {
      return NextResponse.json(
        { error: "توضیح کار بیش از حد طولانی است" },
        { status: 400 }
      );
    }

    const priority = isValidTaskPriority(body.priority)
      ? body.priority
      : "medium";

    let assigneeId: number | null = null;
    if (body.assigneeId !== undefined && body.assigneeId !== null) {
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
      assigneeId = candidate;
    }

    let startDate: Date | null = null;
    let dueDate: Date | null = null;
    if (body.startDate) {
      const d = new Date(body.startDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json(
          { error: "تاریخ شروع نامعتبر است" },
          { status: 400 }
        );
      }
      startDate = d;
    }
    if (body.dueDate) {
      const d = new Date(body.dueDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json(
          { error: "مهلت نامعتبر است" },
          { status: 400 }
        );
      }
      dueDate = d;
    }
    if (startDate && dueDate && dueDate < startDate) {
      return NextResponse.json(
        { error: "مهلت نمی‌تواند قبل از تاریخ شروع باشد" },
        { status: 400 }
      );
    }

    const [task] = await db
      .insert(tasks)
      .values({
        projectId,
        title,
        description: description || null,
        creatorId: authUser.userId,
        assigneeId,
        priority,
        startDate,
        dueDate,
      })
      .returning();

    auditLog("task_created", {
      taskId: task.id,
      projectId,
      creatorId: authUser.userId,
      assigneeId,
    });
    await logProjectActivity({
      projectId,
      actorId: authUser.userId,
      entityType: "task",
      entityId: task.id,
      entityTitle: task.title,
      type: "task_created",
    });

    const [creator] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, authUser.userId));
    let assigneeName: string | null = null;
    if (assigneeId) {
      const [assignee] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, assigneeId));
      assigneeName = assignee?.name ?? null;
    }

    return NextResponse.json(
      {
        task: {
          ...task,
          creatorName: creator?.name ?? "",
          assigneeName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Tasks POST error:", error);
    return NextResponse.json({ error: "خطای داخلی سرور" }, { status: 500 });
  }
}
