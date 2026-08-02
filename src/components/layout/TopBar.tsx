"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import { Bell } from "lucide-react";

interface TopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {actions}
          {user && (
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <Avatar name={user.name} src={user.avatar} size="sm" />
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-slate-900 leading-tight">
                  {user.name}
                </p>
                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
