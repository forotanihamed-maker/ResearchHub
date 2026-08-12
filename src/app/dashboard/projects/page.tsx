"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ProjectCardSkeleton } from "@/components/ui/Skeleton";
import { FolderKanban, Search } from "lucide-react";
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

export default function ProjectsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["projects", statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/projects?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ projects: Project[] }>;
    },
  });

  const allProjects = data?.projects ?? [];

  const filtered = allProjects.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.professorName.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <TopBar
        title="Browse Projects"
        subtitle="Discover research opportunities"
      />

      <div className="p-6 space-y-5">
        {/* Search Bar */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search projects, professors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
        </div>

        {/* Status Tabs */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150",
                statusFilter === f.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        {!isLoading && !isError && (
          <p className="text-sm text-slate-500">
            {filtered.length} project{filtered.length !== 1 ? "s" : ""} found
          </p>
        )}

        {/* Projects Grid */}
        {isError ? (
          <ErrorState
            title="Couldn't load projects"
            description="Something went wrong while fetching projects."
            onRetry={() => refetch()}
          />
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="No projects found"
            description={
              search
                ? "Try adjusting your search"
                : "No research projects are available yet"
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                role={user?.role}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
