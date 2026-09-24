/*src\components\projects\TasksPanel.tsx */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { ListTodo, Plus, AlertTriangle, Trash2 } from "lucide-react";
import { formatDate, formatTimeAgo, cn } from "@/lib/utils";

interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  creatorId: number;
  creatorName: string;
  assigneeId: number | null;
  assigneeName: string | null;
}

interface Member {
  id: number;
  name: string;
}

const STATUS_LABEL: Record<Task["status"], string> = {
  todo: "انجام‌نشده",
  in_progress: "در حال انجام",
  done: "انجام‌شده",
};

const STATUS_BADGE: Record<Task["status"], string> = {
  todo: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-50 text-blue-700",
  done: "bg-emerald-50 text-emerald-700",
};

const PRIORITY_LABEL: Record<Task["priority"], string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
};

const PRIORITY_BADGE: Record<Task["priority"], string> = {
  low: "bg-slate-100 text-slate-500",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-red-50 text-red-700",
};

function isOverdue(task: Task) {
  return (
    !!task.dueDate &&
    new Date(task.dueDate).getTime() < Date.now() &&
    task.status !== "done"
  );
}

export function TasksPanel({
  projectId,
  members,
  isOwner,
  currentUserId,
}: {
  projectId: number;
  members: Member[];
  isOwner: boolean;
  currentUserId?: number;
}) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    priority: "medium" as Task["priority"],
    dueDate: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ tasks: Task[] }>;
    },
  });

  const tasks = data?.tasks ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          assigneeId: form.assigneeId ? Number(form.assigneeId) : undefined,
          priority: form.priority,
          dueDate: form.dueDate || undefined,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "ساخت کار ناموفق بود");
      return resData;
    },
    onSuccess: () => {
      setCreateOpen(false);
      setForm({
        title: "",
        description: "",
        assigneeId: "",
        priority: "medium",
        dueDate: "",
      });
      setError("");
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: number;
      status: Task["status"];
    }) => {
      const res = await fetch(
        `/api/projects/${projectId}/tasks/${taskId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const res = await fetch(
        `/api/projects/${projectId}/tasks/${taskId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    createMutation.mutate();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <ListTodo size={18} className="text-indigo-600" />
          <h3 className="font-semibold text-slate-900">کارها</h3>
          <span className="text-xs text-slate-400">· {tasks.length} کار</span>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> کار جدید
        </Button>
      </div>

      <div className="divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">در حال بارگذاری...</div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <ListTodo size={40} className="mb-3 text-slate-200" />
            <p className="text-sm font-medium">هنوز کاری ثبت نشده</p>
          </div>
        ) : (
          tasks.map((task) => {
            const canEdit =
              isOwner || task.assigneeId === currentUserId;
            const overdue = isOverdue(task);
            return (
              <div key={task.id} className="px-5 py-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">
                        {task.title}
                      </p>
                      <Badge className={PRIORITY_BADGE[task.priority]}>
                        اولویت: {PRIORITY_LABEL[task.priority]}
                      </Badge>
                      {overdue && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                          <AlertTriangle size={11} /> مهلت گذشته
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-400">
                      مسئول: {task.assigneeName ?? "تعیین‌نشده"} · سازنده:{" "}
                      {task.creatorName}
                      {task.dueDate &&
                        ` · مهلت: ${formatDate(task.dueDate)}`}
                      {` · به‌روزرسانی ${formatTimeAgo(task.updatedAt)}`}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <select
                      disabled={!canEdit || statusMutation.isPending}
                      value={task.status}
                      onChange={(e) =>
                        statusMutation.mutate({
                          taskId: task.id,
                          status: e.target.value as Task["status"],
                        })
                      }
                      className={cn(
                        "rounded-lg border px-2 py-1 text-xs bg-white",
                        STATUS_BADGE[task.status]
                      )}
                    >
                      {(
                        Object.keys(STATUS_LABEL) as Task["status"][]
                      ).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                    {isOwner && (
                      <button
                        type="button"
                        title="حذف کار"
                        onClick={() => deleteMutation.mutate(task.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="کار جدید"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="عنوان کار"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <Textarea
            label="توضیح (اختیاری)"
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              مسئول (اختیاری)
            </label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
              value={form.assigneeId}
              onChange={(e) =>
                setForm({ ...form, assigneeId: e.target.value })
              }
            >
              <option value="">تعیین‌نشده</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                اولویت
              </label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                value={form.priority}
                onChange={(e) =>
                  setForm({
                    ...form,
                    priority: e.target.value as Task["priority"],
                  })
                }
              >
                {(Object.keys(PRIORITY_LABEL) as Task["priority"][]).map(
                  (p) => (
                    <option key={p} value={p}>
                      {PRIORITY_LABEL[p]}
                    </option>
                  )
                )}
              </select>
            </div>
            <Input
              label="مهلت (اختیاری)"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
            >
              لغو
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              ساخت کار
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
