/*src\app\dashboard\applications\page.tsx */
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  statusColor,
  statusLabel,
  formatTimeAgo,
  formatDate,
} from "@/lib/utils";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  X,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Application {
  id: number;
  projectId: number;
  studentId: number;
  status: string;
  message?: string | null;
  createdAt: string;
  updatedAt: string;
  projectTitle: string;
  projectDescription: string;
  projectStatus: string;
  professorName: string;
  professorDepartment?: string | null;
}

const STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Cancelled", value: "cancelled" },
];

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  approved: CheckCircle2,
  rejected: XCircle,
  cancelled: X,
};

export default function ApplicationsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["my-applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ applications: Application[] }>;
    },
    enabled: user?.role === "student",
  });

  const cancelMutation = useMutation({
    mutationFn: async ({
      projectId,
      appId,
    }: {
      projectId: number;
      appId: number;
    }) => {
      const res = await fetch(
        `/api/projects/${projectId}/applications/${appId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "cancelled" }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const apps = data?.applications ?? [];
  const filtered =
    statusFilter === "all"
      ? apps
      : apps.filter((a) => a.status === statusFilter);

  return (
    <div>
      <TopBar
        title="My Applications"
        subtitle="Track the status of your project applications"
      />

      <div className="p-6 space-y-5">
        {/* Status tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                statusFilter === f.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {f.label}
              {f.value !== "all" && (
                <span className="ml-1.5 text-xs opacity-60">
                  {apps.filter((a) => a.status === f.value).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-32 bg-slate-100 animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={
              statusFilter === "all"
                ? "No applications yet"
                : `No ${statusFilter} applications`
            }
            description={
              statusFilter === "all"
                ? "Browse research projects and apply to ones that match your interests"
                : "No applications match this status"
            }
            action={
              statusFilter === "all" ? (
                <Link href="/dashboard/projects">
                  <Button>
                    <ArrowRight size={16} /> Browse Projects
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((app) => {
              const StatusIcon = statusIcons[app.status] || FileText;
              return (
                <div
                  key={app.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "flex-shrink-0 rounded-xl p-3",
                        app.status === "approved" && "bg-emerald-50",
                        app.status === "pending" && "bg-amber-50",
                        app.status === "rejected" && "bg-red-50",
                        app.status === "cancelled" && "bg-slate-100"
                      )}
                    >
                      <StatusIcon
                        size={20}
                        className={cn(
                          app.status === "approved" && "text-emerald-600",
                          app.status === "pending" && "text-amber-600",
                          app.status === "rejected" && "text-red-600",
                          app.status === "cancelled" && "text-slate-500"
                        )}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <h3 className="font-semibold text-slate-900 text-sm">
                            {app.projectTitle}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            by {app.professorName}
                            {app.professorDepartment &&
                              ` · ${app.professorDepartment}`}
                          </p>
                        </div>
                        <Badge className={statusColor(app.status)}>
                          {statusLabel(app.status)}
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                        {app.projectDescription}
                      </p>

                      {app.message && (
                        <div className="bg-slate-50 rounded-lg p-3 mb-3">
                          <p className="text-xs text-slate-600 italic">
                            Your note: "{app.message}"
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>Applied {formatTimeAgo(app.createdAt)}</span>
                          {app.status !== "pending" && (
                            <span>Updated {formatTimeAgo(app.updatedAt)}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {app.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                cancelMutation.mutate({
                                  projectId: app.projectId,
                                  appId: app.id,
                                })
                              }
                              loading={cancelMutation.isPending}
                            >
                              Cancel
                            </Button>
                          )}
                          <Link href={`/dashboard/projects/${app.projectId}`}>
                            <Button variant="ghost" size="sm">
                              View Project <ArrowRight size={12} />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
