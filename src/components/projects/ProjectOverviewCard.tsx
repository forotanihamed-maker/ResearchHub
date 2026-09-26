/*src\components\projects\ProjectOverviewCard.tsx */
"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ListTodo, Flag, AlertTriangle, Clock } from "lucide-react";
import { formatDate, formatTimeAgo, getDeadlineStatus } from "@/lib/utils";

interface OverviewData {
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
  };
  milestones: {
    total: number;
    reached: number;
    remaining: number;
  };
  latestMilestone: { id: number; title: string; reachedAt: string } | null;
}

interface ActivityItem {
  id: number;
  type: string;
  entityTitle: string;
  detail: string | null;
  actorName: string;
  createdAt: string;
}

// همان متن‌های RecentActivity.tsx — برای هماهنگی کامل عبارت‌ها.
function describeActivity(item: ActivityItem): string {
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

// نوار پیشرفت ساده — بدون هیچ منطق اضافه (Health Score/امتیاز/غیره).
function ProgressBar({
  label,
  count,
  total,
  colorClass,
  extra,
}: {
  label: string;
  count: number;
  total: number;
  colorClass: string;
  extra?: string;
}) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span>
          {total > 0
            ? `${count} از ${total} (${percent}%)${extra ? ` · ${extra}` : ""}`
            : "بدون مورد"}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function ProjectOverviewCard({
  projectId,
  deadline,
}: {
  projectId: number;
  deadline?: string | null;
}) {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["overview", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/overview`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<OverviewData>;
    },
  });

  // queryKey عمداً همان چیزی است که RecentActivity.tsx استفاده می‌کند تا
  // React Query کش را به اشتراک بگذارد و درخواست شبکه‌ی جدیدی ایجاد نشود.
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ["activity", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/activity`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ activity: ActivityItem[] }>;
    },
  });

  const deadlineStatus = getDeadlineStatus(deadline);
  const recentActivity = (activityData?.activity ?? []).slice(0, 3);

  return (
    <Card>
      <CardBody>
        <h3 className="mb-4 font-semibold text-slate-900">نمای کلی پروژه</h3>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3 text-center">
            <p className="text-xs text-slate-500">کل کارها</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {overviewLoading ? "—" : overview?.tasks.total ?? 0}
            </p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3 text-center">
            <p className="text-xs text-blue-600">در حال انجام</p>
            <p className="mt-1 text-lg font-semibold text-blue-700">
              {overviewLoading ? "—" : overview?.tasks.inProgress ?? 0}
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3 text-center">
            <p className="text-xs text-emerald-600">انجام‌شده</p>
            <p className="mt-1 text-lg font-semibold text-emerald-700">
              {overviewLoading ? "—" : overview?.tasks.done ?? 0}
            </p>
          </div>
          <div className="rounded-lg bg-red-50 p-3 text-center">
            <p className="text-xs text-red-600">عقب‌افتاده</p>
            <p className="mt-1 text-lg font-semibold text-red-700">
              {overviewLoading ? "—" : overview?.tasks.overdue ?? 0}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <ProgressBar
            label="پیشرفت کارها"
            count={overview?.tasks.done ?? 0}
            total={overview?.tasks.total ?? 0}
            colorClass="bg-emerald-500"
          />
          <ProgressBar
            label="پیشرفت نقاط پیشرفت"
            count={overview?.milestones.reached ?? 0}
            total={overview?.milestones.total ?? 0}
            colorClass="bg-indigo-500"
            extra={
              overview && overview.milestones.total > 0
                ? `باقی‌مانده: ${overview.milestones.remaining}`
                : undefined
            }
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Deadline */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-100 p-3">
            <Clock size={16} className="shrink-0 text-slate-400" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500">مهلت انجام</p>
              {deadlineStatus ? (
                <Badge
                  className={
                    deadlineStatus.tone === "overdue"
                      ? "bg-red-50 text-red-700"
                      : deadlineStatus.tone === "today"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                  }
                >
                  {deadlineStatus.label}
                </Badge>
              ) : (
                <p className="text-sm text-slate-400">تعیین‌نشده</p>
              )}
            </div>
          </div>

          {/* Latest milestone */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-100 p-3">
            <Flag size={16} className="shrink-0 text-slate-400" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500">آخرین نقطه پیشرفت</p>
              {overviewLoading ? (
                <p className="text-sm text-slate-400">در حال بارگذاری...</p>
              ) : overview?.latestMilestone ? (
                <p className="truncate text-sm font-medium text-slate-800">
                  {overview.latestMilestone.title} ·{" "}
                  {formatDate(overview.latestMilestone.reachedAt)}
                </p>
              ) : (
                <p className="text-sm text-slate-400">هنوز ثبت نشده</p>
              )}
            </div>
          </div>
        </div>

        {!overviewLoading && overview && overview.tasks.overdue > 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle size={15} />
            {overview.tasks.overdue} کار از مهلت خودش عقب‌تر است
          </div>
        )}

        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <ListTodo size={13} /> فعالیت‌های اخیر
          </p>
          {activityLoading ? (
            <p className="text-sm text-slate-400">در حال بارگذاری...</p>
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-slate-400">هنوز فعالیتی ثبت نشده</p>
          ) : (
            <ul className="space-y-1.5">
              {recentActivity.map((item) => (
                <li key={item.id} className="text-xs text-slate-600">
                  <span className="font-medium text-slate-900">
                    {item.actorName}
                  </span>{" "}
                  {describeActivity(item)}
                  <span className="text-slate-400">
                    {" "}
                    — {formatTimeAgo(item.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
