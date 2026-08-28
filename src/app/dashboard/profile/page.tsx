/*src\app\dashboard\profile\page.tsx */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { X, Plus, Save, GraduationCap, Mail } from "lucide-react";
import { formatDate } from "@/lib/utils";
import {
  DEPARTMENTS,
  PROGRAMMING_LANGUAGES,
  MAX_INTERESTS,
  INTEREST_MAX_LEN,
} from "@/lib/validation";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    bio: "",
    department: "",
    university: "",
  });
  const [languages, setLanguages] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user?.role === "admin") {
      router.replace("/dashboard/admin");
      return;
    }
    if (user) {
      setForm({
        name: user.name || "",
        bio: user.bio || "",
        department: user.department || "",
        university: user.university || "",
      });
      setLanguages(user.programmingLanguages || []);
      setInterests(user.interests || []);
    }
  }, [user, router]);

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
          programmingLanguages: languages,
          interests,
        }),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      return res.json();
    },
    onSuccess: async () => {
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["me"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const toggleLanguage = (lang: string) => {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const addInterest = () => {
    const trimmed = interestInput.trim();
    if (!trimmed) return;
    if (trimmed.length > INTEREST_MAX_LEN) return;
    if (interests.includes(trimmed)) return;
    if (interests.length >= MAX_INTERESTS) return;
    setInterests((prev) => [...prev, trimmed]);
    setInterestInput("");
  };

  const removeInterest = (value: string) => {
    setInterests((prev) => prev.filter((i) => i !== value));
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
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-slate-900 truncate">
                  {user.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
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
                  <span className="text-sm text-slate-500 flex items-center gap-1 min-w-0">
                    <Mail size={12} className="shrink-0" />
                    <span className="truncate">{user.email}</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Department
                  </label>
                  <select
                    value={form.department}
                    onChange={(e) =>
                      setForm({ ...form, department: e.target.value })
                    }
                    className="w-full rounded-lg border px-3 py-2.5 text-base sm:text-sm text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
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

        {/* Programming Languages */}
        <Card>
          <CardBody>
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">
                Programming Languages
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Languages you're comfortable working with
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {PROGRAMMING_LANGUAGES.map((lang) => {
                const isSelected = languages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLanguage(lang)}
                    className={
                      isSelected
                        ? "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                        : "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-all"
                    }
                  >
                    {isSelected ? <X size={12} /> : <Plus size={12} />}
                    {lang}
                  </button>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* Interests */}
        <Card>
          <CardBody>
            <div className="mb-4">
              <h3 className="font-semibold text-slate-900">
                Research Interests
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                Short labels like &quot;Machine Learning&quot; or &quot;Web
                Security&quot; (up to {MAX_INTERESTS})
              </p>
            </div>

            {interests.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {interests.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => removeInterest(interest)}
                    className="flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 transition-colors"
                  >
                    {interest}
                    <X size={12} />
                  </button>
                ))}
              </div>
            )}

            {interests.length < MAX_INTERESTS && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addInterest();
                    }
                  }}
                  maxLength={INTEREST_MAX_LEN}
                  placeholder="Add an interest..."
                  className="flex-1 rounded-lg border px-3 py-2 text-base sm:text-sm border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Button type="button" variant="outline" onClick={addInterest}>
                  <Plus size={14} /> Add
                </Button>
              </div>
            )}
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
