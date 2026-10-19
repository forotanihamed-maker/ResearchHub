/*src/app/dashboard/admin/depatments/page.tsx */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { ArrowLeft, Building2 } from "lucide-react";

export default function AdminDepartmentsPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/departments")
      .then((r) => r.json())
      .then((data) => setSelected(data.selected ?? []))
      .catch(() => setMessage("دریافت گروه‌های آموزشی ناموفق بود"))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div>
      <TopBar
        title="گروه‌های آموزشی"
        subtitle="گروه‌های آموزشی تحت مدیریت این مدیر"
      />
      <main className="p-6 lg:p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={16} /> بازگشت به پنل مدیریت
          </Link>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Building2 size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  گروه‌های آموزشی تحت مدیریت
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  دانشجویان، استادان و پروژه‌های خارج از این محدوده در داشبورد
                  این مدیر نمایش داده نمی‌شوند.
                </p>
              </div>
            </div>
            {loaded && selected.length === 0 && !message ? (
              <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                هنوز گروه آموزشی به شما اختصاص داده نشده؛ با مالک سامانه تماس
                بگیرید.
              </p>
            ) : (
              <div className="mt-6 flex flex-wrap gap-3">
                {selected.map((department) => (
                  <span
                    key={department}
                    className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-800"
                  >
                    {department}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-500">
              برای تغییر گروه‌های آموزشی با مالک سامانه تماس بگیرید.
            </p>
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
