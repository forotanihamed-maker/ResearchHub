/*src\components\projects\RecentActivity.tsx */
"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardBody } from "@/components/ui/Card";
import { History } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

interface ActivityItem {
  id: number;
  type:
    | "task_created"
    | "task_status_changed"
    | "task_deleted"
    | "task_reassigned"
    | "milestone_created"
    | "milestone_reached"
    | "milestone_reverted"
    | "milestone_deleted";
  entityType: "task" | "milestone";
  entityTitle: string;
  detail: string | null;
  actorName: string;
  createdAt: string;
}

// متن هر نوع رویداد — دقیقاً هم‌راستا با ۸ نوع تأییدشده‌ی فاز ۳. entityTitle
// و detail هر دو Snapshot هستند (مستقل از وضعیت فعلی Task/Milestone).
function describe(item: ActivityItem): string {
  const title = `«${item.entityTitle}»`;
  switch (item.type) {
    case "task_created":
      return `کار ${title} را ایجاد کرد`;
    case "task_status_changed":
      return `وضعیت ${title} را به «${item.detail}» تغییر داد`;
    case "task_deleted":
      return `کار ${title} را حذف کرد`;
    case "task_reassigned":
      return `مسئول ${title} را به ${item.detail} تغییر داد`;
    case "milestone_created":
      return `نقطه پیشرفت ${title} را ایجاد کرد`;
    case "milestone_reached":
      return `به نقطه پیشرفت ${title} رسید`;
    case "milestone_reverted":
      return `نقطه پیشرفت ${title} را به حالت در انتظار بازگرداند`;
    case "milestone_deleted":
      return `نقطه پیشرفت ${title} را حذف کرد`;
    default:
      return `${title} را تغییر داد`;
  }
}

export function RecentActivity({ projectId }: { projectId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["activity", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/activity`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ activity: ActivityItem[] }>;
    },
  });

  const activity = data?.activity ?? [];

  if (!isLoading && activity.length === 0) return null;

  return (
    <Card>
      <CardBody>
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
          <History size={16} className="text-slate-400" />
          فعالیت‌های اخیر
        </h3>
        {isLoading ? (
          <p className="text-sm text-slate-500">در حال بارگذاری...</p>
        ) : (
          <ul className="space-y-2.5">
            {activity.map((item) => (
              <li key={item.id} className="text-sm text-slate-600">
                <span className="font-medium text-slate-900">
                  {item.actorName}
                </span>{" "}
                {describe(item)}
                <span className="text-slate-400">
                  {" "}
                  — {formatTimeAgo(item.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
