/*src\app\dashboard\page.tsx */
"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
  ArrowLeft,
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
  const router = useRouter();

  useEffect(() => {
    if (user?.role === "admin") router.replace("/dashboard/admin");
  }, [user, router]);

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("خطا در دریافت آمار");
      return res.json() as Promise<{ stats: Stats }>;
    },
    enabled: !!user && user.role !== "admin",
  });

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects-recent"],
    queryFn: async () => {
      const url =
        user?.role === "professor"
          ? "/api/projects?my=true"
          : "/api/projects?status=open";
      const res = await fetch(url);
      if (!res.ok) throw new Error("خطا در دریافت پروژه‌ها");
      return res.json() as Promise<{ projects: Project[] }>;
    },
    enabled: !!user && user.role !== "admin",
  });

  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ["my-applications"],
    queryFn: async () => {
      const res = await fetch("/api/applications");
      if (!res.ok) throw new Error("خطا در دریافت درخواست‌ها");
      return res.json() as Promise<{ applications: Application[] }>;
    },
    enabled: user?.role === "student",
  });

  const stats = statsData?.stats;
  const projects = projectsData?.projects?.slice(0, 4) ?? [];
  const applications = appsData?.applications?.slice(0, 4) ?? [];

  const professorStats = [
    {
      label: "کل پروژه‌ها",
      value: stats?.totalProjects ?? 0,
      icon: FolderKanban,
      color: "bg-indigo-50 text-indigo-600",
      desc: "مجموع تاکنون",
    },
    {
      label: "پروژه‌های باز",
      value: stats?.openProjects ?? 0,
      icon: BookOpen,
      color: "bg-emerald-50 text-emerald-600",
      desc: "در حال پذیرش درخواست",
    },
    {
      label: "درخواست‌های در انتظار",
      value: stats?.pendingApplications ?? 0,
      icon: AlertCircle,
      color: "bg-amber-50 text-amber-600",
      desc: "منتظر بررسی شما",
    },
    {
      label: "اعضای تیم",
      value: stats?.totalMembers ?? 0,
      icon: Users,
      color: "bg-purple-50 text-purple-600",
      desc: "در همه پروژه‌ها",
    },
  ];

  const studentStats = [
    {
      label: "درخواست‌های ارسالی",
      value: stats?.totalApplications ?? 0,
      icon: FileText,
      color: "bg-indigo-50 text-indigo-600",
      desc: "مجموع ارسال‌شده",
    },
    {
      label: "در انتظار",
      value: stats?.pendingApplications ?? 0,
      icon: Clock,
      color: "bg-amber-50 text-amber-600",
      desc: "منتظر تصمیم",
    },
    {
      label: "تأییدشده",
      value: stats?.approvedApplications ?? 0,
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-600",
      desc: "درخواست‌های موفق",
    },
    {
      label: "پروژه‌های عضو",
      value: stats?.projectsJoined ?? 0,
      icon: Users,
      color: "bg-purple-50 text-purple-600",
      desc: "عضویت‌های فعال",
    },
  ];

  if (user?.role === "admin") return null;

  const displayStats =
    user?.role === "professor" ? professorStats : studentStats;

  return (
    <div>
      <TopBar
        title={`خوش آمدید، ${user?.name?.split(" ")[0]} 👋`}
        subtitle={`${user?.role === "professor" ? "استاد" : "دانشجو"} · ${
          user?.department || "سامانه پژوهشی دانشگاه"
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
                  ? "پروژه‌های اخیر شما"
                  : "پروژه‌های باز"}
              </h2>
              <Link
                href={
                  user?.role === "professor"
                    ? "/dashboard/my-projects"
                    : "/dashboard/projects"
                }
                className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                مشاهده همه <ArrowLeft size={12} />
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
                  <p>هنوز پروژه‌ای وجود ندارد</p>
                  {user?.role === "professor" && (
                    <Link
                      href="/dashboard/my-projects/new"
                      className="mt-2 inline-block text-indigo-600 hover:underline text-xs"
                    >
                      ساخت اولین پروژه ←
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
                <h2 className="font-semibold text-slate-900">درخواست‌های من</h2>
                <Link
                  href="/dashboard/applications"
                  className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  مشاهده همه <ArrowLeft size={12} />
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
                    <p>هنوز درخواستی ارسال نشده</p>
                    <Link
                      href="/dashboard/projects"
                      className="mt-2 inline-block text-indigo-600 hover:underline text-xs"
                    >
                      مرور پروژه‌های باز ←
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
                <h2 className="font-semibold text-slate-900">آمار سریع</h2>
              </div>
              <CardBody className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <BookOpen size={16} className="text-emerald-600" />
                    </div>
                    <span className="text-sm text-slate-700">
                      پروژه‌های باز
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
                    <span className="text-sm text-slate-700">در حال انجام</span>
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
                    <span className="text-sm text-slate-700">تکمیل‌شده</span>
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
                      در انتظار بررسی
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
