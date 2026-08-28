/*src/app/dashboard/admin/depatments/page.tsx */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { DEPARTMENTS } from "@/lib/validation";
import { ArrowLeft, Building2, Check } from "lucide-react";

export default function AdminDepartmentsPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/departments")
      .then((r) => r.json())
      .then((data) => setSelected(data.selected ?? []))
      .catch(() => setMessage("Unable to load departments"));
  }, []);

  const toggle = (department: string) => {
    setSelected((current) =>
      current.includes(department)
        ? current.filter((d) => d !== department)
        : [...current, department]
    );
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/departments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ departments: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save");
      setMessage("Department scope saved successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <TopBar
        title="Department Management"
        subtitle="Choose which departments this admin can manage"
      />
      <main className="p-6 lg:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={16} /> Back to Admin Panel
          </Link>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Managed departments
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Students, professors and projects outside this scope stay
                  outside this admin&apos;s dashboard.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {DEPARTMENTS.map((department) => {
                const active = selected.includes(department);
                return (
                  <button
                    key={department}
                    type="button"
                    onClick={() => toggle(department)}
                    className={`flex items-center justify-between rounded-xl border p-4 text-right transition ${
                      active
                        ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                        : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-sm font-medium">{department}</span>
                    {active && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white">
                        <Check size={14} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
              <p className="text-sm text-slate-500">
                {selected.length} department(s) selected
              </p>
              <button
                onClick={save}
                disabled={saving || selected.length === 0}
                className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save departments"}
              </button>
            </div>
            {message && (
              <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                {message}
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
