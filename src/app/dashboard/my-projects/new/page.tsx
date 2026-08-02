"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { DEPARTMENT_SKILLS_MAP } from "@/lib/constants";

export default function NewProjectPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    maxMembers: 5,
    deadline: "",
    skillIds: [] as number[], // فقط مهارت‌های مرتبط با گرایش استاد
  });

  // ==============================
  // ⭐ کلید اصلی: فقط مهارت‌های مرتبط با گرایش استاد
  // ==============================
  const availableSkills = DEPARTMENT_SKILLS_MAP[user?.department || ""] || [];

  // اگر استاد گرایش نداشته باشد یا مهارت‌هایش پیدا نشود
  if (!user?.department || availableSkills.length === 0) {
    return (
      <div>
        <TopBar title="New Project" subtitle="Create a new research project" />
        <div className="p-6">
          <Card>
            <CardBody className="p-6 text-center text-red-600">
              <p>❌ You dont have a department assigned.</p>
              <p className="text-sm text-slate-500 mt-2">
                Please update your profile first.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  // ==============================
  // ارسال فرم
  // ==============================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (form.skillIds.length === 0) {
      setError("Please select at least one skill");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          maxMembers: form.maxMembers,
          deadline: form.deadline || null,
          skillIds: form.skillIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create project");
      }

      router.push("/dashboard/my-projects");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <TopBar title="New Project" subtitle="Create a new research project" />

      <div className="p-6 max-w-2xl">
        <Card>
          <CardBody className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Project Title"
                placeholder="e.g., AI-based Medical Diagnosis"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />

              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Describe your research project..."
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Max Members"
                  type="number"
                  min={1}
                  max={10}
                  value={form.maxMembers}
                  onChange={(e) =>
                    setForm({ ...form, maxMembers: parseInt(e.target.value) })
                  }
                  required
                />
                <Input
                  label="Deadline"
                  type="date"
                  value={form.deadline}
                  onChange={(e) =>
                    setForm({ ...form, deadline: e.target.value })
                  }
                />
              </div>

              {/* ⭐ بخش انتخاب مهارت‌ها (فقط گرایش استاد) */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Required Skills
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Based on your department:{" "}
                  <span className="font-semibold text-indigo-600">
                    {user.department}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableSkills.map((skill) => {
                    // فرض می‌کنیم این مهارت‌ها در دیتابیس موجود هستند
                    // برای سادگی، از id ساختگی استفاده می‌کنیم
                    const skillId = skill; // در عمل باید از دیتابیس بیاید
                    const isSelected = form.skillIds.includes(skillId as any);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => {
                          const id = skillId as any;
                          setForm((prev) => ({
                            ...prev,
                            skillIds: prev.skillIds.includes(id)
                              ? prev.skillIds.filter((s) => s !== id)
                              : [...prev.skillIds, id],
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
                {form.skillIds.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    Please select at least one skill
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={loading}>
                  Create Project
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
