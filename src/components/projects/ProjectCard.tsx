/*src\components\projects\projectcard.tsx */
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import {
  statusColor,
  statusLabel,
  formatDate,
  formatTimeAgo,
} from "@/lib/utils";
import { PROJECT_TYPE_LABELS, type ProjectType } from "@/lib/validation";
import {
  Users,
  Calendar,
  ArrowRight,
  GraduationCap,
  Building2,
} from "lucide-react";

const PROJECT_TYPE_COLOR: Record<ProjectType, string> = {
  thesis: "bg-purple-50 text-purple-700 border-purple-200",
  internship: "bg-orange-50 text-orange-700 border-orange-200",
  course: "bg-sky-50 text-sky-700 border-sky-200",
  research: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

interface ProjectCardProps {
  project: {
    id: number;
    title: string;
    description: string;
    status: string;
    type?: ProjectType;
    creatorId?: number;
    creatorRole?: "professor" | "student";
    visibility?: "public" | "private";
    professorName: string;
    professorDepartment?: string | null;
    professorUniversity?: string | null;
    memberCount: number;
    maxMembers: number;
    deadline?: string | null;
    createdAt: string;
    pendingApplications?: number;
  };
  showActions?: boolean;
  role?: "professor" | "student" | "admin";
}

export function ProjectCard({
  project,
  showActions = true,
  role,
}: ProjectCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 flex flex-col">
      <div className="p-5 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 flex-1">
            {project.title}
          </h3>
          <Badge className={`${statusColor(project.status)} flex-shrink-0`}>
            {statusLabel(project.status)}
          </Badge>
        </div>

        {project.visibility === "private" && (
          <div className="mb-3"><Badge className="bg-amber-50 text-amber-700 border-amber-200">🔒 خصوصی</Badge></div>
        )}

        {project.type && (
          <div className="mb-3">
            <Badge className={PROJECT_TYPE_COLOR[project.type]}>
              {PROJECT_TYPE_LABELS[project.type]}
            </Badge>
          </div>
        )}

        {/* Description */}
        <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
          {project.description}
        </p>

        {/* Creator info */}
        <div className="flex items-center gap-2 mb-4 p-3 bg-slate-50 rounded-lg">
          <Avatar name={project.professorName} size="xs" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">
              {project.professorName}
            </p>
            <p className="text-[11px] text-indigo-600 mt-0.5">{project.creatorRole === "student" ? "ساخته‌شده توسط دانشجو" : "ساخته‌شده توسط استاد"}</p>
            {(project.professorDepartment || project.professorUniversity) && (
              <p className="text-xs text-slate-500 truncate">
                {project.professorDepartment}
                {project.professorDepartment &&
                  project.professorUniversity &&
                  " · "}
                {project.professorUniversity}
              </p>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <Users size={12} />
            {project.memberCount}/{project.maxMembers} عضو
          </span>
          {project.deadline && (
            <span className="flex items-center gap-1.5">
              <Calendar size={12} />
              مهلت: {formatDate(project.deadline)}
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      {showActions && (
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {formatTimeAgo(project.createdAt)}
          </span>
          <div className="flex items-center gap-2">
            {role === "professor" &&
            project.pendingApplications &&
            project.pendingApplications > 0 ? (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                {project.pendingApplications} در انتظار
              </span>
            ) : null}
            <Link href={`/dashboard/projects/${project.id}`}>
              <Button size="sm" variant="outline">
                مشاهده <ArrowRight size={12} className="rtl:rotate-180" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
