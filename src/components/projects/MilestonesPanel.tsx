/*src\components\projects\MilestonesPanel.tsx */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Textarea } from "@/components/ui/Input";
import { Flag, Plus, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Milestone {
  id: number;
  projectId: number;
  title: string;
  description: string | null;
  status: "pending" | "reached";
  reachedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  createdByName: string;
}

export function MilestonesPanel({
  projectId,
  isOwner,
}: {
  projectId: number;
  isOwner: boolean;
}) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", description: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["milestones", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/milestones`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ milestones: Milestone[] }>;
    },
  });

  const milestones = data?.milestones ?? [];

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim() || undefined,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "ساخت نقطه پیشرفت ناموفق بود");
      return resData;
    },
    onSuccess: () => {
      setCreateOpen(false);
      setForm({ title: "", description: "" });
      setError("");
      queryClient.invalidateQueries({ queryKey: ["milestones", projectId] });
    },
    onError: (err: Error) => setError(err.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      milestoneId,
      status,
    }: {
      milestoneId: number;
      status: Milestone["status"];
    }) => {
      const res = await fetch(
        `/api/projects/${projectId}/milestones/${milestoneId}`,
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
      queryClient.invalidateQueries({ queryKey: ["milestones", projectId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (milestoneId: number) => {
      const res = await fetch(
        `/api/projects/${projectId}/milestones/${milestoneId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["milestones", projectId] }),
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
          <Flag size={18} className="text-indigo-600" />
          <h3 className="font-semibold text-slate-900">نقاط پیشرفت پروژه</h3>
        </div>
        {isOwner && (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> نقطه جدید
          </Button>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-6 text-sm text-slate-500">در حال بارگذاری...</div>
        ) : milestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Flag size={40} className="mb-3 text-slate-200" />
            <p className="text-sm font-medium">هنوز نقطه پیشرفتی ثبت نشده</p>
          </div>
        ) : (
          milestones.map((m) => (
            <div key={m.id} className="flex items-start gap-3 px-5 py-4">
              <button
                type="button"
                disabled={!isOwner || statusMutation.isPending}
                onClick={() =>
                  statusMutation.mutate({
                    milestoneId: m.id,
                    status: m.status === "reached" ? "pending" : "reached",
                  })
                }
                title={
                  isOwner
                    ? m.status === "reached"
                      ? "بازگرداندن به در انتظار"
                      : "علامت‌گذاری به‌عنوان رسیده"
                    : undefined
                }
                className="mt-0.5 shrink-0 disabled:cursor-default"
              >
                {m.status === "reached" ? (
                  <CheckCircle2 size={20} className="text-emerald-600" />
                ) : (
                  <Circle size={20} className="text-slate-300" />
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p
                  className={`font-medium ${
                    m.status === "reached"
                      ? "text-slate-900"
                      : "text-slate-600"
                  }`}
                >
                  {m.title}
                </p>
                {m.description && (
                  <p className="mt-1 text-xs text-slate-500">
                    {m.description}
                  </p>
                )}
                <p className="mt-1.5 text-xs text-slate-400">
                  {m.status === "reached" && m.reachedAt
                    ? `رسیده در ${formatDate(m.reachedAt)}`
                    : "در انتظار"}
                  {` · ثبت‌شده توسط ${m.createdByName}`}
                </p>
              </div>

              {isOwner && (
                <button
                  type="button"
                  title="حذف"
                  onClick={() => deleteMutation.mutate(m.id)}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="نقطه پیشرفت جدید"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="عنوان"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="مثلاً: طراحی"
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
              ثبت
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
