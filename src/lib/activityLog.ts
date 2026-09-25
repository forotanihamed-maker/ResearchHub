// src/lib/activityLog.ts
// ه.۳ — ثبت رویدادهای ساختاریافته‌ی Task/Milestone برای نمایش «فعالیت‌های
// اخیر» به کاربر. این جدا از src/lib/auditLog.ts است: auditLog فقط
// console.log امنیتی/عملیاتی است (نه در دیتابیس، نه برای نمایش به کاربر)؛
// projectActivity یک جدول واقعی و مستقل برای همین منظور است. فقط سرور
// می‌نویسد؛ هیچ Endpoint مستقلی برای نوشتن مستقیم توسط کاربر وجود ندارد.

import { db } from "@/db";
import { projectActivity } from "@/db/schema";

type ActivityType =
  | "task_created"
  | "task_status_changed"
  | "task_deleted"
  | "task_reassigned"
  | "milestone_created"
  | "milestone_reached"
  | "milestone_reverted"
  | "milestone_deleted";

export async function logProjectActivity(params: {
  projectId: number;
  actorId: number;
  entityType: "task" | "milestone";
  entityId: number;
  entityTitle: string;
  type: ActivityType;
  detail?: string | null;
}) {
  try {
    await db.insert(projectActivity).values({
      projectId: params.projectId,
      actorId: params.actorId,
      entityType: params.entityType,
      entityId: params.entityId,
      entityTitle: params.entityTitle,
      type: params.type,
      detail: params.detail ?? null,
    });
  } catch (error) {
    // ثبت فعالیت هرگز نباید عملیات اصلی (ساخت/ویرایش/حذف Task یا
    // Milestone) را با خطا متوقف کند — فقط لاگ می‌شود.
    console.error("logProjectActivity error:", error);
  }
}
