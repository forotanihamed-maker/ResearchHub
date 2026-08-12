"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { statusColor, statusLabel, formatTimeAgo } from "@/lib/utils";
import {
  FileText,
  CheckCircle2,
  XCircle,
  GraduationCap,
  Building2,
} from "lucide-react";

interface Application {
  id: number;
  projectId: number;
  studentId: number;
  status: string;
  message?: string | null;
  createdAt: string;
  studentName: string;
  studentEmail: string;
  studentAvatar?: string | null;
  studentDepartment?: string | null;
  studentUniversity?: string | null;
  studentInterests?: string[];
  studentProgrammingLanguages?: string[];
}

export function ApplicationsPanel({ projectId }: { projectId: number }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["project-applications", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/applications`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ applications: Application[] }>;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      appId,
      status,
    }: {
      appId: number;
      status: string;
    }) => {
      const res = await fetch(
        `/api/projects/${projectId}/applications/${appId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["project-applications", projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ["project", String(projectId)],
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const applications = data?.applications ?? [];
  const pending = applications.filter((a) => a.status === "pending");
  const others = applications.filter((a) => a.status !== "pending");

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No applications yet"
        description="When students apply to this project, they will appear here."
      />
    );
  }

  const AppCard = ({ app }: { app: Application }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <Avatar name={app.studentName} src={app.studentAvatar} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-slate-900 text-sm">
              {app.studentName}
            </p>
            <Badge className={statusColor(app.status)}>
              {statusLabel(app.status)}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mb-1">{app.studentEmail}</p>
          <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
            {app.studentDepartment && (
              <span className="flex items-center gap-1">
                <GraduationCap size={11} /> {app.studentDepartment}
              </span>
            )}
            {app.studentUniversity && (
              <span className="flex items-center gap-1">
                <Building2 size={11} /> {app.studentUniversity}
              </span>
            )}
          </div>

          {app.studentInterests?.length ||
          app.studentProgrammingLanguages?.length ? (
            <div className="flex flex-wrap gap-1 mb-3">
              {app.studentInterests?.map((interest) => (
                <span
                  key={`i-${interest}`}
                  className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-100"
                >
                  {interest}
                </span>
              ))}
              {app.studentProgrammingLanguages?.map((lang) => (
                <span
                  key={`l-${lang}`}
                  className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-100"
                >
                  {lang}
                </span>
              ))}
            </div>
          ) : null}

          {app.message && (
            <div className="bg-slate-50 rounded-lg p-3 mb-3">
              <p className="text-xs text-slate-600 italic">"{app.message}"</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Applied {formatTimeAgo(app.createdAt)}
            </span>
            {app.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() =>
                    updateMutation.mutate({ appId: app.id, status: "rejected" })
                  }
                  loading={updateMutation.isPending}
                >
                  <XCircle size={14} /> Reject
                </Button>
                <Button
                  size="sm"
                  variant="success"
                  onClick={() =>
                    updateMutation.mutate({ appId: app.id, status: "approved" })
                  }
                  loading={updateMutation.isPending}
                >
                  <CheckCircle2 size={14} /> Approve
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
            Pending Review
            <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
              {pending.length}
            </span>
          </h3>
          <div className="space-y-3">
            {pending.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        </div>
      )}

      {others.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-700 mb-3 text-sm">
            Previous Applications
          </h3>
          <div className="space-y-3">
            {others.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
