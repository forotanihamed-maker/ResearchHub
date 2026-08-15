/*src\app\auth\register\page.tsx */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import Link from "next/link";
import {
  FlaskConical,
  GraduationCap,
  BookOpen,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEPARTMENTS } from "@/lib/validation";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "" as "professor" | "student" | "",
    department: "",
    university: "",
    bio: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role) {
      setError("Please select your role");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role as "professor" | "student",
        department: form.department,
        university: "دانشگاه علم و صنعت ایران",
        bio: form.bio,
      });
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-indigo-600 shadow-lg mb-4">
            <FlaskConical size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">ResearchHub</h1>
          <p className="text-slate-400 text-sm">Join the research community</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">
            Create your account
          </h2>

          {/* Role selection */}
          <div className="mb-5">
            <p className="text-sm font-medium text-slate-700 mb-3">I am a...</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, role: "professor" })}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  form.role === "professor"
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-slate-200 hover:border-indigo-300"
                )}
              >
                <GraduationCap
                  size={24}
                  className={
                    form.role === "professor"
                      ? "text-indigo-600 mb-2"
                      : "text-slate-400 mb-2"
                  }
                />
                <p
                  className={cn(
                    "font-semibold text-sm",
                    form.role === "professor"
                      ? "text-indigo-700"
                      : "text-slate-700"
                  )}
                >
                  Professor
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Post research projects
                </p>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, role: "student" })}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  form.role === "student"
                    ? "border-emerald-600 bg-emerald-50"
                    : "border-slate-200 hover:border-emerald-300"
                )}
              >
                <BookOpen
                  size={24}
                  className={
                    form.role === "student"
                      ? "text-emerald-600 mb-2"
                      : "text-slate-400 mb-2"
                  }
                />
                <p
                  className={cn(
                    "font-semibold text-sm",
                    form.role === "student"
                      ? "text-emerald-700"
                      : "text-slate-700"
                  )}
                >
                  Student
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Apply to projects
                </p>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label="Full Name"
              placeholder="Dr. Jane Smith"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <Input
              label="Email address"
              type="email"
              placeholder="you@university.edu"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPw ? "text" : "password"}
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">دانشگاه</label>
              <input
                type="text"
                value="دانشگاه علم و صنعت ایران"
                disabled
                className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-700"
              />
            </div>

            {/* گرایش مهندسی کامپیوتر */}
            <div>
              <label className="block text-sm font-medium mb-1">
                گرایش مهندسی کامپیوتر
              </label>
              <select
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
                required
                className="w-full border rounded px-3 py-2"
              >
                <option value="">انتخاب گرایش</option>
                {DEPARTMENTS.map((field) => (
                  <option key={field} value={field}>
                    {field}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              loading={loading}
            >
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-5">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-indigo-600 hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
