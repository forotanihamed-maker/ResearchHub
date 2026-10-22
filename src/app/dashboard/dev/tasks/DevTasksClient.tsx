"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, ClipboardCopy, Power } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

const STATUS_LABELS: Record<string, string> = {
  open: "باز",
  in_progress: "در حال انجام",
  resolved: "حل‌شده",
  dismissed: "ردشده",
};
const SEVERITY_LABELS: Record<string, string> = {
  critical: "بحرانی",
  high: "زیاد",
  medium: "متوسط",
  low: "کم",
};
const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-slate-100 text-slate-700 border-slate-200",
};

interface TaskRow {
  id: number;
  title: string;
  severity: string;
  category: string | null;
  status: string;
  confidence: number | null;
  createdAt: string;
}
interface ListResponse {
  tasks: TaskRow[];
  hasMore: boolean;
  page: number;
  counts: Record<string, number>;
}
interface Source {
  type: "report" | "error";
  id: number;
  pagePath?: string;
  description?: string;
  category?: string | null;
  source?: string;
  route?: string;
  message?: string;
  count?: number;
  createdAt?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
}
interface DetailResponse {
  task: TaskRow & {
    summary: string;
    suggestedFix: string | null;
    updatedAt: string;
  };
  sources: Source[];
  runs: { model: string; inputTokens: number; outputTokens: number; costUsd: number }[];
}
interface BudgetResponse {
  budget: { month: string; capUsd: number; usedUsd: number; killSwitch: boolean } | null;
  runsThisMonth: number;
  enabled: boolean;
  configError?: boolean;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}
async function patchJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

async function deleteJson(url: string): Promise<void> {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) throw new Error(String(res.status));
}

const fa = (n: number) => n.toLocaleString("fa-IR");

function BudgetBar() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["dev-budget"], queryFn: () => getJson<BudgetResponse>("/api/dev/budget") });
  const toggle = useMutation({
    mutationFn: (killSwitch: boolean) => patchJson<BudgetResponse>("/api/dev/budget", { killSwitch }),
    onSuccess: (data) => qc.setQueryData(["dev-budget"], data),
  });
  if (q.isLoading) return <Card><CardBody>در حال بارگذاری بودجه…</CardBody></Card>;
  if (q.isError || !q.data?.budget) {
    return (
      <ErrorState
        title="بودجه خوانده نشد"
        description={q.error instanceof Error && q.error.message === "500" ? "خطای سرور؛ لاگ Vercel را ببینید." : undefined}
        onRetry={() => q.refetch()}
      />
    );
  }
  const b = q.data.budget;
  const pct = b.capUsd > 0 ? Math.min(100, (b.usedUsd / b.capUsd) * 100) : 0;
  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-[200px] flex-1">
            <p className="text-sm text-slate-600">
              هزینه‌ی ماه <bdi dir="ltr">{b.month}</bdi>: <b>${b.usedUsd.toFixed(4)}</b> از سقف <b>${b.capUsd.toFixed(2)}</b>
              {" "}— {fa(q.data.runsThisMonth)} فراخوانی
            </p>
            <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden" dir="ltr">
              <div className={pct > 80 ? "h-full bg-red-500" : "h-full bg-indigo-500"} style={{ width: `${pct}%` }} />
            </div>
            {q.data.configError && <p className="mt-1 text-xs text-red-700">تنظیمات هوش مصنوعی روی سرور ناقص یا نامعتبر است (AI_PROVIDER، AI_BASE_URL، AI_MODEL_TRIAGE، AI_API_KEY)؛ پردازش خودکار تا اصلاح آن کار نمی‌کند.</p>}
            {!q.data.enabled && <p className="mt-1 text-xs text-amber-700">AI_ENABLED=false روی سرور تنظیم شده است.</p>}
          </div>
          <Button
            variant={b.killSwitch ? "success" : "danger"}
            size="sm"
            loading={toggle.isPending}
            onClick={() => {
              if (!b.killSwitch && !window.confirm("پردازش خودکار هوش مصنوعی متوقف شود؟")) return;
              toggle.mutate(!b.killSwitch);
            }}
          >
            <Power size={14} />
            {b.killSwitch ? "فعال‌سازی دوباره" : "توقف اضطراری"}
          </Button>
        </div>
        {b.killSwitch && <p className="mt-2 text-sm text-red-700">توقف اضطراری روشن است؛ هیچ فراخوانی به مدل انجام نمی‌شود.</p>}
        {toggle.isError && <p className="mt-2 text-sm text-red-700">تغییر انجام نشد.</p>}
      </CardBody>
    </Card>
  );
}

function TaskDetail({ id, onClose }: { id: number; onClose: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["dev-task", id], queryFn: () => getJson<DetailResponse>(`/api/dev/tasks/${id}`) });
  const change = useMutation({
    mutationFn: (status: string) => patchJson(`/api/dev/tasks/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dev-task", id] });
      qc.invalidateQueries({ queryKey: ["dev-tasks"] });
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteJson(`/api/dev/tasks/${id}`),
    onSuccess: () => {
      qc.removeQueries({ queryKey: ["dev-task", id] });
      qc.invalidateQueries({ queryKey: ["dev-tasks"] });
      onClose();
    },
  });
  const [promptText, setPromptText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const makePrompt = useMutation({
    mutationFn: () => getJson<{ prompt: string }>(`/api/dev/tasks/${id}/prompt`),
    onSuccess: (data) => { setPromptText(data.prompt); setCopied(false); },
  });
  async function copyPrompt() {
    if (promptText === null) return;
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
    } catch {
      setCopied(false); // clipboard blocked: the text stays selectable in the box
    }
  }

  if (q.isLoading) return <Card><CardBody>در حال بارگذاری…</CardBody></Card>;
  if (q.isError || !q.data) return <ErrorState title="جزئیات خوانده نشد" onRetry={() => q.refetch()} />;
  const { task, sources, runs } = q.data;
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-bold text-slate-900">{task.title}</h2>
          <button type="button" className="text-sm text-slate-500" onClick={onClose}>بستن</button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge className={SEVERITY_STYLE[task.severity]}>{SEVERITY_LABELS[task.severity] ?? task.severity}</Badge>
          {task.category && <Badge variant="outline">{task.category}</Badge>}
          <Badge variant="outline">اطمینان: {task.confidence === null ? "نامشخص" : `${Math.round(task.confidence * 100)}٪`}</Badge>
        </div>

        <h3 className="mt-4 text-sm font-semibold text-slate-700">خلاصه</h3>
        <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{task.summary}</p>

        {task.suggestedFix && (
          <>
            <h3 className="mt-4 text-sm font-semibold text-slate-700">پیشنهاد رفع (فقط پیشنهاد)</h3>
            <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{task.suggestedFix}</p>
          </>
        )}

        <h3 className="mt-4 text-sm font-semibold text-slate-700">منبع</h3>
        {sources.length === 0 && <p className="text-sm text-slate-500">منبعی ثبت نشده.</p>}
        {sources.map((s) => (
          <div key={`${s.type}-${s.id}`} className="mt-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            {s.type === "report" ? (
              <>
                <p className="text-xs text-slate-500">گزارش #{s.id} · صفحه: <span dir="ltr">{s.pagePath}</span> · <bdi dir="ltr">{s.createdAt}</bdi></p>
                <p className="mt-1 whitespace-pre-wrap">{s.description}</p>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-500">
                  خطای {s.source === "client" ? "مرورگر" : "سرور"} #{s.id} · <span dir="ltr">{s.route}</span> · {s.count} بار · آخرین: <bdi dir="ltr">{s.lastSeenAt}</bdi>
                </p>
                <p className="mt-1 whitespace-pre-wrap" dir="ltr">{s.message}</p>
              </>
            )}
          </div>
        ))}

        {runs.length > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            تحلیل: {runs.map((r) => r.model).join(" ← ")} · هزینه ${runs.reduce((n, r) => n + r.costUsd, 0).toFixed(5)}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={task.status === value ? "primary" : "outline"}
              disabled={change.isPending || task.status === value}
              onClick={() => change.mutate(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        {change.isError && <p className="mt-2 text-sm text-red-700">تغییر وضعیت انجام نشد.</p>}
        {(task.status === "resolved" || task.status === "dismissed") && (
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              loading={remove.isPending}
              onClick={() => {
                if (window.confirm("این تسک برای همیشه حذف شود؟ (اگر منبعش یک خطا بوده، همان رویداد خطا هم پاک می‌شود. گزارش کاربر می‌ماند.)")) remove.mutate();
              }}
            >
              حذف تسک
            </Button>
            {remove.isError && <p className="mt-2 text-sm text-red-700">حذف انجام نشد.</p>}
          </div>
        )}

        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-700">پرامپت رفع برای Claude</h3>
          <p className="mt-1 text-xs text-slate-500">
            متن آماده برای دادن به مدل کدنویسی. پیش از استفاده بخوانیدش؛ تحلیل خودکار فرضیه است.
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" loading={makePrompt.isPending} onClick={() => makePrompt.mutate()}>
              <ClipboardCopy size={14} />
              ساخت پرامپت
            </Button>
            {promptText !== null && (
              <Button size="sm" onClick={copyPrompt}>{copied ? "کپی شد ✓" : "کپی"}</Button>
            )}
          </div>
          {makePrompt.isError && <p className="mt-2 text-sm text-red-700">ساخت پرامپت انجام نشد.</p>}
          {promptText !== null && (
            <textarea
              readOnly
              value={promptText}
              onFocus={(e) => e.currentTarget.select()}
              className="mt-2 h-72 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 text-xs leading-6"
              dir="rtl"
            />
          )}
        </div>
      </CardBody>
    </Card>
  );
}

export function DevTasksClient() {
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);

  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (severity) params.set("severity", severity);
  params.set("page", String(page));

  const q = useQuery({
    queryKey: ["dev-tasks", status, severity, page],
    queryFn: () => getJson<ListResponse>(`/api/dev/tasks?${params.toString()}`),
  });

  return (
    <>
      <TopBar title="پنل دستیار توسعه‌دهنده" subtitle="تسک‌های ساخته‌شده از گزارش‌ها و خطاها" />
      <div className="p-4 lg:p-8 space-y-4" dir="rtl">
        <BudgetBar />

        <div className="flex flex-wrap gap-2">
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="وضعیت">
            <option value="">همه‌ی وضعیت‌ها</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}{q.data?.counts[v] ? ` (${fa(q.data.counts[v])})` : ""}</option>
            ))}
          </select>
          <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={severity}
            onChange={(e) => { setSeverity(e.target.value); setPage(1); }} aria-label="اولویت">
            <option value="">همه‌ی اولویت‌ها</option>
            {Object.entries(SEVERITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            {q.isLoading && <p className="text-sm text-slate-500">در حال بارگذاری…</p>}
            {q.isError && <ErrorState title="فهرست خوانده نشد" onRetry={() => q.refetch()} />}
            {q.data && q.data.tasks.length === 0 && (
              <EmptyState icon={Bot} title="تسکی وجود ندارد" description="بعد از اجرای بعدی پردازشگر، تسک‌ها اینجا می‌آیند." />
            )}
            {q.data?.tasks.map((t) => (
              <Card key={t.id} hover onClick={() => setSelected(t.id)} className={selected === t.id ? "ring-2 ring-indigo-400" : ""}>
                <CardBody>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{t.title}</p>
                    <Badge className={SEVERITY_STYLE[t.severity]}>{SEVERITY_LABELS[t.severity] ?? t.severity}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {STATUS_LABELS[t.status] ?? t.status} · {t.category ?? "—"} · <bdi dir="ltr">{t.createdAt}</bdi>
                  </p>
                </CardBody>
              </Card>
            ))}
            {q.data && (page > 1 || q.data.hasMore) && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>قبلی</Button>
                <Button size="sm" variant="outline" disabled={!q.data.hasMore} onClick={() => setPage(page + 1)}>بعدی</Button>
              </div>
            )}
          </div>

          <div>
            {selected !== null ? (
              <TaskDetail key={selected} id={selected} onClose={() => setSelected(null)} />
            ) : (
              <p className="text-sm text-slate-500">برای دیدن جزئیات، یک تسک را انتخاب کنید.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
