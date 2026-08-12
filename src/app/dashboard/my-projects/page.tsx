"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectCardSkeleton } from "@/components/ui/Skeleton";
import { Plus, FolderKanban } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Project {
  id: number;
  title: string;
  description: string;
  status: string;
  professorName: string;
  professorDepartment?: string | null;
  professorUniversity?: string | null;
  memberCount: number;
  maxMembers: number;
  deadline?: string | null;
  createdAt: string;
  pendingApplications?: number;
}

const STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
];

export default function MyProjectsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["my-projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects?my=true");
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ projects: Project[] }>;
    },
    enabled: user?.role === "professor",
  });

  const projects = data?.projects ?? [];
  const filtered =
    statusFilter === "all"
      ? projects
      : projects.filter((p) => p.status === statusFilter);

  return (
    <div>
      <TopBar
        title="My Projects"
        subtitle="Manage your research projects and applications"
        actions={
          <Link href="/dashboard/my-projects/new">
            <Button>
              <Plus size={16} /> New Project
            </Button>
          </Link>
        }
      />

      <div className="p-6 space-y-5">
        {/* Status tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
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
                  {projects.filter((p) => p.status === f.value).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title={
              statusFilter === "all"
                ? "No projects yet"
                : `No ${statusFilter.replace("_", " ")} projects`
            }
            description={
              statusFilter === "all"
                ? "Create your first research project and start recruiting students"
                : "No projects match this status"
            }
            action={
              statusFilter === "all" ? (
                <Link href="/dashboard/my-projects/new">
                  <Button>
                    <Plus size={16} /> Create Project
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                role="professor"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
