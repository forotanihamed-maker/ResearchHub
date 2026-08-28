"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { Badge } from "@/components/ui/Badge";
import {
  Building2,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Users,
  FlaskConical,
  XCircle,
  ArrowRight,
} from "lucide-react";

interface Professor {
  id: number;
  name: string;
  email: string;
  department: string;
  professorStatus: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface AdminProject {
  id: number;
  title: string;
  description: string;
  status: "open" | "in_progress" | "completed";
  maxMembers: number;
  deadline: string | null;
  createdAt: string;
  professorName: string;
  professorEmail: string;
  professorDepartment: string;
  memberCount: number;
  pendingApplications: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState({
    students: 0,
    professors: 0,
    projects: 0,
  });
  const [departments, setDepartments] = useState<string[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [statsRes, departmentsRes, professorsRes, projectsRes] =
        await Promise.all([
          fetch("/api/admin/stats"),
          fetch("/api/admin/departments"),
          fetch("/api/admin/professors"),
          fetch("/api/admin/projects"),
        ]);

      if (
        !statsRes.ok ||
        !departmentsRes.ok ||
        !professorsRes.ok ||
        !projectsRes.ok
      ) {
        throw new Error();
      }

      const [statsData, departmentsData, professorsData, projectsData] =
        await Promise.all([
          statsRes.json(),
          departmentsRes.json(),
          professorsRes.json(),
          projectsRes.json(),
        ]);

      setStats(statsData);
      setDepartments(departmentsData.selected ?? []);
      setProfessors(professorsData.professors ?? []);
      setProjects(projectsData.projects ?? []);
      setError("");
    } catch {
      setError(
        "Unable to load admin data. Check your department assignments and database connection."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pending = useMemo(
    () => professors.filter((p) => p.professorStatus === "pending"),
    [professors]
  );

  const updateStatus = async (id: number, status: "approved" | "rejected") => {
    setActionId(id);
    try {
      const res = await fetch("/api/admin/professors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Update failed");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      <TopBar
        title="Admin Panel"
        subtitle="ResearchHub university administration"
      />
      <main className="p-6 lg:p-8 space-y-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Administration
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              University overview
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Users are scoped to assigned departments; projects are visible for
              university-wide supervision.
            </p>
          </div>
          <Link
            href="/dashboard/admin/departments"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Building2 size={16} /> Manage departments <ArrowRight size={15} />
          </Link>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Metric title="Students" value={stats.students} icon={Users} />
          <Metric
            title="Professors"
            value={stats.professors}
            icon={GraduationCap}
          />
          <Metric
            title="All Projects"
            value={stats.projects}
            icon={FlaskConical}
          />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="font-semibold text-slate-900">
                Managed departments
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Departments assigned to this admin.
              </p>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {departments.length}
            </span>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((department) => (
              <div
                key={department}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
              >
                {department}
              </div>
            ))}
            {!loading && departments.length === 0 && (
              <p className="text-sm text-amber-700">
                No department is assigned yet.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="font-semibold text-slate-900">
                All research projects
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                University-wide supervisory view. This list is not restricted by
                the admin's department scope.
              </p>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              {projects.length}
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 text-sm text-slate-500">
                Loading projects...
              </div>
            ) : projects.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                No projects found.
              </div>
            ) : (
              projects.slice(0, 20).map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="block px-5 py-4 hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">
                          {project.title}
                        </p>
                        <ProjectStatus status={project.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-1">
                        {project.description}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        {project.professorName} · {project.professorDepartment}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-3 text-xs text-slate-500">
                      <span>
                        {project.memberCount}/{project.maxMembers} members
                      </span>
                      <span>{project.pendingApplications} pending</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="font-semibold text-slate-900">
                Professor approval
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Review professor registrations in your managed departments.
              </p>
            </div>
            {pending.length > 0 && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {pending.length} pending
              </span>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 text-sm text-slate-500">Loading...</div>
            ) : professors.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                No professors in your managed departments.
              </div>
            ) : (
              professors.map((professor) => (
                <div
                  key={professor.id}
                  className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-slate-900">
                        {professor.name}
                      </p>
                      <Status status={professor.professorStatus} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {professor.email} · {professor.department}
                    </p>
                  </div>
                  {professor.professorStatus === "pending" && (
                    <div className="flex gap-2">
                      <button
                        disabled={actionId === professor.id}
                        onClick={() => updateStatus(professor.id, "approved")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} />
                        Approve
                      </button>
                      <button
                        disabled={actionId === professor.id}
                        onClick={() => updateStatus(professor.id, "rejected")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        <XCircle size={14} />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon size={19} />
      </div>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
function Status({ status }: { status: Professor["professorStatus"] }) {
  if (status === "pending")
    return (
      <Badge className="bg-amber-50 text-amber-700">
        <Clock3 size={12} />
        Pending
      </Badge>
    );
  if (status === "approved")
    return (
      <Badge className="bg-emerald-50 text-emerald-700">
        <CheckCircle2 size={12} />
        Approved
      </Badge>
    );
  return (
    <Badge className="bg-red-50 text-red-700">
      <XCircle size={12} />
      Rejected
    </Badge>
  );
}
function ProjectStatus({ status }: { status: AdminProject["status"] }) {
  if (status === "open")
    return <Badge className="bg-emerald-50 text-emerald-700">Open</Badge>;
  if (status === "in_progress")
    return <Badge className="bg-blue-50 text-blue-700">In Progress</Badge>;
  return <Badge className="bg-slate-100 text-slate-700">Completed</Badge>;
}
