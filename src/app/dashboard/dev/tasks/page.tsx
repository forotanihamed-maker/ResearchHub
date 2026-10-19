// src/app/dashboard/dev/tasks/page.tsx
// Placeholder until the task-panel stage builds the real page.
import { requireDevPanelUser } from "@/lib/devAccess";

export const dynamic = "force-dynamic";

export default async function DevTasksPage() {
  await requireDevPanelUser("dashboard/dev/tasks");

  return (
    <div className="p-6 lg:p-8" dir="rtl">
      <h1 className="text-xl font-bold text-slate-900">
        پنل دستیار توسعه‌دهنده
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        دسترسی شما تأیید شد. فهرست تسک‌ها در مرحله‌ی پنل به این صفحه اضافه می‌شود.
      </p>
    </div>
  );
}
