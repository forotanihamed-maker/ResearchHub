"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody } from "@/components/ui/Card";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    maxMembers: 5,
    deadline: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          maxMembers: form.maxMembers,
          deadline: form.deadline || null,
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
