/**src\app\admin\AdminStats.tsx */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, FlaskConical, GraduationCap, Users } from "lucide-react";

type Stats = {
  students: number;
  professors: number;
  projects: number;
  departments?: string[];
};

export default function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const res = await fetch("/api/admin/stats", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load statistics");
        }

        if (!cancelled) {
          setStats({
            students: Number(data.students ?? 0),
            professors: Number(data.professors ?? 0),
            projects: Number(data.projects ?? 0),
            departments: Array.isArray(data.departments)
              ? data.departments
              : [],
          });
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load statistics"
          );
        }
      }
    }

    loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Students",
      value: stats.students,
      icon: Users,
      iconClass: "bg-indigo-50 text-indigo-600",
    },
    {
      title: "Professors",
      value: stats.professors,
      icon: GraduationCap,
      iconClass: "bg-emerald-50 text-emerald-600",
    },
    {
      title: "Projects",
      value: stats.projects,
      icon: FlaskConical,
      iconClass: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div
                className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${card.iconClass}`}
              >
                <Icon size={19} />
              </div>
              <p className="text-sm text-slate-500">{card.title}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {card.value}
              </p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-indigo-600" />
              <h2 className="font-semibold text-slate-900">
                Managed Departments
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              These departments define the scope of the statistics above.
            </p>
          </div>

          <Link
            href="/dashboard/admin/departments"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Manage departments →
          </Link>
        </div>

        {stats.departments && stats.departments.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {stats.departments.map((department) => (
              <span
                key={department}
                className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700"
              >
                {department}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
            No department is assigned to this admin yet. Assign at least one
            department from the Admin Panel.
          </p>
        )}
      </section>
    </div>
  );
}
