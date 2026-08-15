/*src\app\dashboard\page.tsx */
"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import {
  StatCardSkeleton,
  ProjectCardSkeleton,
} from "@/components/ui/Skeleton";
import {
  statusColor,
  statusLabel,
  formatDate,
  formatTimeAgo,
} from "@/lib/utils";
import {
  FolderKanban,
  FileText,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import Link from "next/link";

interface Stats {
  totalProjects?: number;
  openProjects?: number;
  inProgressProjects?: number;
  completedProjects?: number;
  totalApplications?: number;
  pendingApplications?: number;
  approvedApplications?: number;
  totalMembers?: number;
  projectsJoined?: number;
}

interface Project {
  id: number;
  title: string;
  description: string;
  status: string;
  professorName: string;
  memberCount: number;
  maxMembers: number;
  createdAt: string;
  deadline?: string;
}

interface Application {
  id: number;
  projectTitle: string;
  status: string;
  professorName: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json() as Promise<{ stats: Stats }>;
    },
  });

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects-recent"],
    queryFn: async () => {
      const url =
        user?.role === "professor"
          ? "/api/projects?my=true"
          : "/api/projects?status=open";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load projects");
      return res.json() as Promise<{ projects: Project[] }>;
    },
    enabled: !!user,
  });

  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ["my-applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications");
      if (!res.ok) throw new Error("Failed to load applications");
      return res.json() as Promise<{ applications: Application[] }>;
    },
    enabled: user?.role === "student",
  });

  const stats = statsData?.stats;
  const projects = projectsData?.projects?.slice(0, 4) ?? [];
  const applications = appsData?.applications?.slice(0, 4) ?? [];

  const professorStats = [
    {
      label: "Total Projects",
      value: stats?.totalProjects ?? 0,
      icon: FolderKanban,
      color: "bg-indigo-50 text-indigo-600",
      desc: "All time",
    },
    {
      label: "Open Projects",
      value: stats?.openProjects ?? 0,
      icon: BookOpen,
      color: "bg-emerald-50 text-emerald-600",
      desc: "Accepting applications",
    },
    {
      label: "Pending Applications",
      value: stats?.pendingApplications ?? 0,
      icon: AlertCircle,
      color: "bg-amber-50 text-amber-600",
      desc: "Awaiting your review",
    },
    {
      label: "Team Members",
      value: stats?.totalMembers ?? 0,
      icon: Users,
      color: "bg-purple-50 text-purple-600",
      desc: "Across all projects",
    },
  ];

  const studentStats = [
    {
      label: "Applications Sent",
      value: stats?.totalApplications ?? 0,
      icon: FileText,
      color: "bg-indigo-50 text-indigo-600",
      desc: "Total submitted",
    },
    {
      label: "Pending",
      value: stats?.pendingApplications ?? 0,
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
      desc: "Awaiting decision",
    },
    {
      label: "Approved",
      value: stats?.approvedApplications ?? 0,
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-600",
      desc: "Successful applications",
    },
    {
      label: "Projects Joined",
      value: stats?.projectsJoined ?? 0,
      icon: Users,
      color: "bg-purple-50 text-purple-600",
      desc: "Active memberships",
    },
  ];

  const displayStats =
    user?.role === "professor" ? professorStats : studentStats;

  return (
    <div>
      <TopBar
        title={`Welcome back, ${user?.name?.split(" ")[0]} 👋`}
        subtitle={`${user?.role === "professor" ? "Professor" : "Student"} · ${
          user?.department || "University Research Platform"
        }`}
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <StatCardSkeleton key={i} />
              ))
            : displayStats.map((stat) => (
                <Card key={stat.label}>
                  <CardBody className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-slate-600">
                        {stat.label}
                      </p>
                      <div className={`rounded-lg p-2 ${stat.color}`}>
                        <stat.icon size={16} />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-slate-900 mb-1">
                      {stat.value}
                    </p>
                    <p className="text-xs text-slate-500">{stat.desc}</p>
                  </CardBody>
                </Card>
              ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <Card>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">
                {user?.role === "professor"
                  ? "Your Recent Projects"
                  : "Open Projects"}
              </h2>
              <Link
                href={
                  user?.role === "professor"
                    ? "/dashboard/my-projects"
                    : "/dashboard/projects"
                }
                className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <CardBody className="p-0">
              {projectsLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <ProjectCardSkeleton key={i} />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  <FolderKanban
                    size={32}
                    className="mx-auto mb-3 text-slate-300"
                  />
                  <p>No projects yet</p>
                  {user?.role === "professor" && (
                    <Link
                      href="/dashboard/my-projects/new"
                      className="mt-2 inline-block text-indigo-600 hover:underline text-xs"
                    >
                      Create your first project →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {projects.map((project) => (
                    <Link
                      key={project.id}
                      href={`/dashboard/projects/${project.id}`}
                      className="flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {project.title}
                          </p>
                          <Badge className={statusColor(project.status)}>
                            {statusLabel(project.status)}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                          {project.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <Users size={11} />
                            {project.memberCount}/{project.maxMembers}
                          </span>
                          <span>{formatTimeAgo(project.createdAt)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Applications or Activity */}
          {user?.role === "student" ? (
            <Card>
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">
                  My Applications
                </h2>
                <Link
                  href="/dashboard/applications"
                  className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  View all <ArrowRight size={12} />
                </Link>
              </div>
              <CardBody className="p-0">
                {appsLoading ? (
                  <div className="p-4 space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-16 bg-slate-100 animate-pulse rounded-lg"
                      />
                    ))}
                  </div>
                ) : applications.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-sm">
                    <FileText
                      size={32}
                      className="mx-auto mb-3 text-slate-300"
                    />
                    <p>No applications yet</p>
                    <Link
                      href="/dashboard/projects"
                      className="mt-2 inline-block text-indigo-600 hover:underline text-xs"
                    >
                      Browse open projects →
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {applications.map((app) => (
                      <div key={app.id} className="flex items-start gap-4 p-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate mb-0.5">
                            {app.projectTitle}
                          </p>
                          <p className="text-xs text-slate-500 mb-2">
                            {app.professorName}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge className={statusColor(app.status)}>
                              {statusLabel(app.status)}
                            </Badge>
                            <span className="text-xs text-slate-400">
                              {formatTimeAgo(app.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ) : (
            <Card>
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900">Quick Stats</h2>
              </div>
              <CardBody className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <BookOpen size={16} className="text-emerald-600" />
                    </div>
                    <span className="text-sm text-slate-700">
                      Open Projects
                    </span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {stats?.openProjects ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <TrendingUp size={16} className="text-blue-600" />
                    </div>
                    <span className="text-sm text-slate-700">In Progress</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {stats?.inProgressProjects ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <CheckCircle2 size={16} className="text-slate-600" />
                    </div>
                    <span className="text-sm text-slate-700">Completed</span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {stats?.completedProjects ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                      <AlertCircle size={16} className="text-amber-600" />
                    </div>
                    <span className="text-sm text-slate-700">
                      Pending Reviews
                    </span>
                  </div>
                  <span className="font-bold text-slate-900">
                    {stats?.pendingApplications ?? 0}
                  </span>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
