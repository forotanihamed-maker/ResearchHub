/*src\app\auth\login\page.tsx */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Link from "next/link";
import { FlaskConical, Eye, EyeOff } from "lucide-react";

// ============================================================
// 📌 حساب‌های تستی — این لیست باید همیشه دقیقاً با ایمیل‌های
// موجود در دیتابیس یکی باشد. برای بررسی سریع می‌توانید از
// GET /api/seed?secret=...&action=list استفاده کنید (فقط خواندنی،
// چیزی را تغییر نمی‌دهد).
// ============================================================
const DEMO_ACCOUNTS = [
  {
    label: "👨‍🏫 استاد - دکتر علی محمدی",
    email: "ali.mohammadi@university.edu",
    password: "professor123",
    role: "Professor",
  },
  {
    label: "👩‍🏫 استاد - دکتر سارا احمدی",
    email: "sara.ahmadi@university.edu",
    password: "professor123",
    role: "Professor",
  },
  {
    label: "🛡️ مدیر سامانه - ResearchHub",
    email: "admin@researchhub.ir",
    password: "admin123",
    role: "Admin",
  },
  {
    label: "🧑‍🎓 دانشجو - رضا کریمی",
    email: "reza.karimi@student.edu",
    password: "student123",
    role: "Student",
  },
  {
    label: "👩‍🎓 دانشجو - مریم حسینی",
    email: "maryam.hosseini@student.edu",
    password: "student123",
    role: "Student",
  },
  {
    label: "🧑‍🎓 دانشجو - امیر رضایی",
    email: "amir.rezaei@student.edu",
    password: "student123",
    role: "Student",
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form.email, form.password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ورود ناموفق بود");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email: string, password: string) => {
    setForm({ email, password });
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 end-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 start-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-indigo-600 shadow-lg mb-4">
            <FlaskConical size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">ResearchHub</h1>
          <p className="text-slate-400 text-sm">وارد حساب کاربری خود شوید</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">خوش آمدید</h2>

          {/* Demo Accounts */}
          <div className="mb-5 bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-xs font-medium text-slate-500 mb-2">
              🧪 حساب‌های آزمایشی (برای پرکردن فرم کلیک کنید):
            </p>
            <div className="flex flex-col gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => fillDemo(acc.email, acc.password)}
                  className="text-start text-xs px-3 py-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 transition-colors flex justify-between items-center"
                >
                  <span className="font-medium text-slate-700">
                    {acc.label}
                  </span>
                  <span className="text-slate-400 text-[10px] truncate max-w-[140px]">
                    {acc.email}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="ایمیل"
              type="email"
              placeholder="you@university.edu"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <div className="relative">
              <Input
                label="رمز عبور"
                type={showPw ? "text" : "password"}
                placeholder="رمز عبور خود را وارد کنید"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute end-3 top-[34px] text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
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
              ورود
            </Button>
          </form>

          <p className="text-center text-sm text-slate-600 mt-5">
            حساب کاربری ندارید؟{" "}
            <Link
              href="/auth/register"
              className="text-indigo-600 hover:underline font-medium"
            >
              ساخت حساب جدید
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
