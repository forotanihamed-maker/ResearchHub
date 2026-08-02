"use client";

import { useState, use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import { statusColor, statusLabel, formatDate, formatTimeAgo } from "@/lib/utils";
import {
  Users,
  Calendar,
  MessageSquare,
  Building2,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Send,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { ChatPanel } from "@/components/projects/ChatPanel";
import { ApplicationsPanel } from "@/components/projects/ApplicationsPanel";

interface ProjectDetail {
  id: number;
  title: string;
  description: string;
  status: string;
  professorId: number;
  professorName: string;
  professorDepartment?: string | null;
  professorUniversity?: string | null;
  professorAvatar?: string | null;
  skills: { id: number; name: string }[];
  members: {
    id: number;
    name: string;
    email: string;
    role: string;
    avatar?: string | null;
    department?: string | null;
    joinedAt: string;
  }[];
  memberCount: number;
  maxMembers: number;
  deadline?: string | null;
  createdAt: string;
  myApplication?: {
    id: number;
    status: string;
    message?: string | null;
    createdAt: string;
  } | null;
  isMember: boolean;
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [applyModal, setApplyModal] = useState(false);
  const [applyMessage, setApplyMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "chat" | "applications">("details");

  const { data, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ project: ProjectDetail }>;
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await fetch(`/api/projects/${id}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to apply");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      setApplyModal(false);
      setApplyMessage("");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (appId: number) => {
      const res = await fetch(`/api/projects/${id}/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
    },
  });

  const project = data?.project;

  if (isLoading) {
    return (
      <div>
        <TopBar title="Loading..." />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-1/2" />
            <div className="h-4 bg-slate-200 rounded w-full" />
            <div className="h-4 bg-slate-200 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div>
        <TopBar title="Project Not Found" />
        <div className="p-6">
          <p className="text-slate-500">This project could not be found.</p>
          <Link href="/dashboard/projects">
            <Button variant="outline" className="mt-4">
              <ArrowLeft size={16} /> Back to Projects
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isProfessor = user?.role === "professor";
  const isOwner = isProfessor && user?.id === project.professorId;
  const myApp = project.myApplication;
  const canApply =
    user?.role === "student" &&
    project.status === "open" &&
    !myApp &&
    !project.isMember;

  const tabs = [
    { key: "details" as const, label: "Details" },
    ...(project.isMember ? [{ key: "chat" as const, label: "Team Chat" }] : []),
    ...(isOwner ? [{ key: "applications" as const, label: "Applications" }] : []),
  ];

  return (
    <div>
      <TopBar
        title={project.title}
        subtitle={`by ${project.professorName}`}
        actions={
          <Link href="/dashboard/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} /> Back
            </Button>
          </Link>
        }
      />

      <div className="p-6 max-w-5xl">
        {/* Tab Nav */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
                activeTab === tab.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "details" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-5">
              {/* Status + Actions */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={`${statusColor(project.status)} text-sm px-3 py-1`}>
                  {statusLabel(project.status)}
                </Badge>
                {canApply && (
                  <Button onClick={() => setApplyModal(true)}>
                    <Send size={16} /> Apply Now
                  </Button>
                )}
                {myApp && myApp.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 px-3 py-1">
                      <Clock size={12} className="mr-1" /> Application Pending
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => cancelMutation.mutate(myApp.id)}
                      loading={cancelMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                {myApp && myApp.status === "approved" && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-3 py-1">
                    <CheckCircle2 size={12} className="mr-1" /> Approved
                  </Badge>
                )}
                {myApp && myApp.status === "rejected" && (
                  <Badge className="bg-red-100 text-red-700 border-red-200 px-3 py-1">
                    <XCircle size={12} className="mr-1" /> Not Selected
                  </Badge>
                )}
                {project.isMember && !myApp && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 px-3 py-1">
                    <UserCheck size={12} className="mr-1" /> You're a member
                  </Badge>
                )}
              </div>

              {/* Description */}
              <Card>
                <CardBody>
                  <h3 className="font-semibold text-slate-900 mb-3">
                    About This Project
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {project.description}
                  </p>
                </CardBody>
              </Card>

              {/* Skills Required */}
              <Card>
                <CardBody>
                  <h3 className="font-semibold text-slate-900 mb-3">
                    Required Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {project.skills.map((skill) => (
                      <span
                        key={skill.id}
                        className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                      >
                        {skill.name}
                      </span>
                    ))}
                    {project.skills.length === 0 && (
                      <p className="text-sm text-slate-500">No specific skills listed</p>
                    )}
                  </div>
                </CardBody>
              </Card>

              {/* Team Members */}
              <Card>
                <CardBody>
                  <h3 className="font-semibold text-slate-900 mb-3">
                    Team Members ({project.memberCount}/{project.maxMembers})
                  </h3>
                  <div className="space-y-3">
                    {project.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                      >
                        <Avatar name={member.name} src={member.avatar} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {member.name}
                          </p>
                          <p className="text-xs text-slate-500 capitalize">
                            {member.role}
                            {member.department && ` · ${member.department}`}
                          </p>
                        </div>
                        {member.role === "professor" && (
                          <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200">
                            PI
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Professor Card */}
              <Card>
                <CardBody>
                  <h3 className="font-semibold text-slate-900 mb-3 text-sm">
                    Principal Investigator
                  </h3>
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar
                      name={project.professorName}
                      src={project.professorAvatar}
                      size="md"
                    />
                    <div>
                      <p className="font-medium text-slate-900 text-sm">
                        {project.professorName}
                      </p>
                      <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 mt-0.5">
                        Professor
                      </Badge>
                    </div>
                  </div>
                  {project.professorDepartment && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                      <GraduationCap size={12} />
                      {project.professorDepartment}
                    </div>
                  )}
                  {project.professorUniversity && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Building2 size={12} />
                      {project.professorUniversity}
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Project Info */}
              <Card>
                <CardBody>
                  <h3 className="font-semibold text-slate-900 mb-3 text-sm">
                    Project Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-2">
                        <Users size={14} /> Members
                      </span>
                      <span className="font-medium text-slate-900">
                        {project.memberCount}/{project.maxMembers}
                      </span>
                    </div>
                    {project.deadline && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 flex items-center gap-2">
                          <Calendar size={14} /> Deadline
                        </span>
                        <span className="font-medium text-slate-900">
                          {formatDate(project.deadline)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Posted</span>
                      <span className="font-medium text-slate-900">
                        {formatTimeAgo(project.createdAt)}
                      </span>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* My Application Status */}
              {myApp && (
                <Card>
                  <CardBody>
                    <h3 className="font-semibold text-slate-900 mb-3 text-sm">
                      My Application
                    </h3>
                    <Badge className={`${statusColor(myApp.status)} mb-3`}>
                      {statusLabel(myApp.status)}
                    </Badge>
                    {myApp.message && (
                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-3 rounded-lg">
                        "{myApp.message}"
                      </p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
                      Applied {formatTimeAgo(myApp.createdAt)}
                    </p>
                  </CardBody>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === "chat" && project.isMember && (
          <ChatPanel projectId={project.id} />
        )}

        {activeTab === "applications" && isOwner && (
          <ApplicationsPanel projectId={project.id} />
        )}
      </div>

      {/* Apply Modal */}
      <Modal
        isOpen={applyModal}
        onClose={() => setApplyModal(false)}
        title="Apply to Project"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-600 mb-1 font-medium">
              {project.title}
            </p>
            <p className="text-xs text-slate-500">by {project.professorName}</p>
          </div>
          <Textarea
            label="Cover Message (optional)"
            placeholder="Tell the professor why you're interested and what you bring to this project..."
            value={applyMessage}
            onChange={(e) => setApplyMessage(e.target.value)}
            rows={5}
          />
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setApplyModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => applyMutation.mutate(applyMessage)}
              loading={applyMutation.isPending}
            >
              <Send size={16} /> Submit Application
            </Button>
          </div>
          {applyMutation.isError && (
            <p className="text-sm text-red-600">
              {applyMutation.error?.message}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
