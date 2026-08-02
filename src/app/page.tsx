"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { FlaskConical } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <FlaskConical size={24} className="text-white" />
          </div>
          <p className="text-slate-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />
      </div>

      <div className="relative">
        {/* Nav */}
        <nav className="flex items-center justify-between px-8 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center">
              <FlaskConical size={18} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg">ResearchHub</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10">
                Sign in
              </Button>
            </Link>
            <Link href="/auth/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="max-w-5xl mx-auto px-8 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm font-medium mb-8">
            <FlaskConical size={14} />
            University Research Platform
          </div>
          <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
            Connect Research
            <span className="text-indigo-400"> Professors </span>
            with Talented
            <span className="text-purple-400"> Students</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            ResearchHub bridges the gap between academic research and student ambition. 
            Find projects that match your skills, collaborate in real-time, and advance science together.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/auth/register">
              <Button size="lg" className="px-8">
                Start Researching →
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button
                size="lg"
                variant="outline"
                className="px-8 border-white/20 text-white hover:bg-white/10"
              >
                Demo Login
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24">
            {[
              {
                icon: "🔬",
                title: "Post Research Projects",
                description:
                  "Professors create detailed project listings with required skills, deadlines, and team size.",
              },
              {
                icon: "🎯",
                title: "Skill-Based Matching",
                description:
                  "Students filter projects by skills to find the perfect research opportunity.",
              },
              {
                icon: "💬",
                title: "Team Collaboration",
                description:
                  "Approved members get access to a real-time group chat for seamless communication.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left hover:bg-white/10 transition-colors"
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400">{f.description}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-6 mt-12 border-t border-white/10 pt-12">
            {[
              { label: "Research Projects", value: "6+" },
              { label: "Active Researchers", value: "10+" },
              { label: "Universities", value: "4+" },
              { label: "Research Fields", value: "8+" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-white mb-1">{s.value}</p>
                <p className="text-sm text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
