/**src\app\admin\AdminStats.tsx */
"use client";

import { useEffect, useState } from "react";

type Stats = {
  students: number;
  professors: number;
  projects: number;
};

export default function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/admin/stats");

        if (!res.ok) {
          throw new Error("Failed to load stats");
        }

        const data = await res.json();

        setStats(data);
      } catch {
        setError("Unable to load statistics");
      }
    }

    loadStats();
  }, []);

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!stats) {
    return <p>Loading statistics...</p>;
  }

  return (
    <div className="mt-8 grid gap-4 md:grid-cols-3">
      <div className="rounded-lg border p-6">
        <h2 className="font-semibold">Students</h2>
        <p className="text-3xl font-bold">{stats.students}</p>
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="font-semibold">Professors</h2>
        <p className="text-3xl font-bold">{stats.professors}</p>
      </div>

      <div className="rounded-lg border p-6">
        <h2 className="font-semibold">Projects</h2>
        <p className="text-3xl font-bold">{stats.projects}</p>
      </div>
    </div>
  );
}
