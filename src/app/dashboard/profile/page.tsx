"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { X, Plus, Save, GraduationCap, Building2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    bio: "",
    department: "",
    university: "",
  });
  const [selectedSkills, setSelectedSkills] = useState<number[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        bio: user.bio || "",
        department: user.department || "",
        university: user.university || "",
      });
      setSelectedSkills(user.skills?.map((s) => s.id) || []);
    }
  }, [user]);

  const { data: skillsData } = useQuery({
    queryKey: ["skills"],
    queryFn: async () => {
      const res = await fetch("/api/skills");
      return res.json() as Promise<{ skills: { id: number; name: string }[] }>;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          bio: form.bio,
          department: form.department,
          university: form.university,
          skillIds: selectedSkills,
        }),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: async () => {
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const toggleSkill = (id: number) => {
    setSelectedSkills((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  if (!user) return null;

  return (
    <div>
      <TopBar
        title="Profile Settings"
        subtitle="Manage your account and preferences"
      />

      <div className="p-6 max-w-2xl space-y-5">
        {/* Profile Card */}
        <Card>
          <CardBody>
            <div className="flex items-center gap-5 mb-6">
              <Avatar name={user.name} size="xl" />
              <div>
                <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    className={
                      user.role === "professor"
                        ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                        : "bg-emerald-100 text-emerald-700 border-emerald-200"
                    }
                  >
                    <GraduationCap size={11} className="mr-1" />
                    {user.role === "professor" ? "Professor" : "Student"}
                  </Badge>
                  <span className="text-sm text-slate-500 flex items-center gap-1">
                    <Mail size={12} /> {user.email}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Member since {formatDate(user.createdAt)}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

              <Textarea
                label="Bio"
                placeholder="Tell others about yourself, your research interests, and expertise..."
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                rows={4}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Department"
                  placeholder="e.g., Computer Science"
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                />
                <Input
                  label="University"
                  placeholder="e.g., MIT"
                  value={form.university}
                  onChange={(e) =>
                    setForm({ ...form, university: e.target.value })
                  }
                />
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Skills */}
        <Card>
          <CardBody>
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">My Skills</h3>
              <p className="text-sm text-slate-500 mt-0.5">
                {user.role === "professor"
                  ? "Skills you bring to research projects"
                  : "Skills that match you with relevant projects"}
              </p>
            </div>

            {/* Selected skills */}
            {selectedSkills.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 p-3 bg-indigo-50 rounded-lg">
                {selectedSkills.map((skillId) => {
                  const skill = skillsData?.skills?.find(
                    (s) => s.id === skillId
                  );
                  if (!skill) return null;
                  return (
                    <button
                      key={skillId}
                      onClick={() => toggleSkill(skillId)}
                      className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                    >
                      {skill.name}
                      <X size={12} />
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {skillsData?.skills
                ?.filter((s) => !selectedSkills.includes(s.id))
                .map((skill) => (
                  <button
                    key={skill.id}
                    onClick={() => toggleSkill(skill.id)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium border border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center gap-1"
                  >
                    <Plus size={12} /> {skill.name}
                  </button>
                ))}
            </div>
          </CardBody>
        </Card>

        {/* Save button */}
        {mutation.isError && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
            Failed to save. Please try again.
          </div>
        )}

        <div className="flex items-center gap-3 justify-end">
          {saved && (
            <span className="text-sm text-emerald-600 font-medium">
              ✓ Profile saved!
            </span>
          )}
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
          >
            <Save size={16} /> Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
