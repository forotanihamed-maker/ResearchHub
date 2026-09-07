/*src\app\dashboard\masssages\page.tsx */
"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { ChatPanel } from "@/components/projects/ChatPanel";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { statusColor, statusLabel, formatTimeAgo } from "@/lib/utils";
import { MessageSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectMembership {
  id: number;
  title: string;
  status: string;
  professorName: string;
  memberCount: number;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null
  );

  const { data: memberProjects, isLoading: memberLoading } = useQuery({
    queryKey: ["member-projects", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/projects?chat=true");
      if (!res.ok) throw new Error("خطا در دریافت پروژه‌های تیمی");
      const json = (await res.json()) as { projects: ProjectMembership[] };
      return json.projects;
    },
  });

  const projects = memberProjects ?? [];

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const selected = projects.find((p) => p.id === selectedProjectId);

  return (
    <div>
      <TopBar
        title="پیام‌های تیمی"
        subtitle="با اعضای تیم پروژه‌های پژوهشی خود گفتگو کنید"
      />

      <div className="p-6">
        {memberLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 bg-slate-100 animate-pulse rounded-xl"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="هنوز گفتگوی تیمی وجود ندارد"
            description="برای دسترسی به گفتگوی تیمی، عضو یک پروژه پژوهشی شوید. برای پروژه‌های باز درخواست دهید یا منتظر تأیید درخواست‌های خود بمانید."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 h-[calc(100vh-180px)]">
            {/* Project list */}
            <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="font-semibold text-slate-900 text-sm">پروژه‌ها</p>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    className={cn(
                      "w-full text-start px-4 py-3 transition-colors",
                      selectedProjectId === project.id
                        ? "bg-indigo-50 border-e-2 border-e-indigo-600"
                        : "hover:bg-slate-50"
                    )}
                  >
                    <p className="text-sm font-medium text-slate-900 truncate mb-0.5">
                      {project.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={`${statusColor(project.status)} text-xs`}
                      >
                        {statusLabel(project.status)}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat panel */}
            <div className="lg:col-span-3">
              {selectedProjectId ? (
                <ChatPanel projectId={selectedProjectId} />
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 h-full flex items-center justify-center">
                  <div className="text-center text-slate-400">
                    <MessageSquare
                      size={40}
                      className="mx-auto mb-3 text-slate-200"
                    />
                    <p className="text-sm font-medium">
                      یک پروژه را برای گفتگو انتخاب کنید
                    </p>
                    <p className="text-xs">
                      از میان پروژه‌های فعال خود انتخاب کنید
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
