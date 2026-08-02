"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProjectCardSkeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { FolderKanban, Search, Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: number;
  title: string;
  description: string;
  status: string;
  professorName: string;
  professorDepartment?: string | null;
  professorUniversity?: string | null;
  skills: { id: number; name: string }[];
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
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const { data: skillsData } = useQuery({
    queryKey: ["skills"],
    queryFn: async () => {
      const res = await fetch("/api/skills");
      return res.json() as Promise<{ skills: { id: number; name: string }[] }>;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["projects", statusFilter, selectedSkills],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (selectedSkills.length > 0)
        params.set("skills", selectedSkills.join(","));
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

  const toggleSkill = (id: number) => {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  return (
    <div>
      <TopBar
        title="Browse Projects"
        subtitle="Discover research opportunities matching your skills"
      />

      <div className="p-6 space-y-5">
        {/* Search + Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
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
          <Button
            variant={showFilters ? "primary" : "outline"}
            onClick={() => setShowFilters((s) => !s)}
          >
            <Filter size={16} />
            Filters
            {selectedSkills.length > 0 && (
              <span className="ml-1 bg-white/20 text-current px-1.5 py-0.5 rounded-full text-xs">
                {selectedSkills.length}
              </span>
            )}
          </Button>
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

        {/* Skill Filters */}
        {showFilters && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-700">
                Filter by Skills
              </p>
              {selectedSkills.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSkills([])}
                >
                  <X size={14} /> Clear
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {skillsData?.skills?.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => toggleSkill(skill.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    selectedSkills.includes(skill.id)
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-300 hover:border-indigo-400"
                  )}
                >
                  {skill.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results count */}
        {!isLoading && (
          <p className="text-sm text-slate-500">
            {filtered.length} project{filtered.length !== 1 ? "s" : ""} found
          </p>
        )}

        {/* Projects Grid */}
        {isLoading ? (
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
              search || selectedSkills.length > 0
                ? "Try adjusting your search or filters"
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
