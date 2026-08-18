/*src/app/dashboard/admin/page.tsx */
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardBody } from "@/components/ui/Card";
import { Users, GraduationCap, FlaskConical } from "lucide-react";

export default function AdminPage() {
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return <div className="p-6 text-red-600">Access denied</div>;
  }

  return (
    <div>
      <TopBar title="Admin Panel" subtitle="ResearchHub Management" />

      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card>
          <CardBody className="p-5">
            <Users className="text-indigo-600 mb-3" />
            <h2 className="font-bold">Manage Users</h2>
            <p className="text-sm text-slate-500">
              Create and manage professors and students
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <GraduationCap className="text-green-600 mb-3" />
            <h2 className="font-bold">Professors</h2>
            <p className="text-sm text-slate-500">
              Professor accounts created by admin
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <FlaskConical className="text-purple-600 mb-3" />
            <h2 className="font-bold">Research Overview</h2>
            <p className="text-sm text-slate-500">Platform statistics</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
