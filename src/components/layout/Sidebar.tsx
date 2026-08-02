"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  FlaskConical,
  Plus,
  BookOpen,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: ("professor" | "student")[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Browse Projects",
    href: "/dashboard/projects",
    icon: FolderKanban,
  },
  {
    label: "My Projects",
    href: "/dashboard/my-projects",
    icon: BookOpen,
    roles: ["professor"],
  },
  {
    label: "My Applications",
    href: "/dashboard/applications",
    icon: FileText,
    roles: ["student"],
  },
  {
    label: "Messages",
    href: "/dashboard/messages",
    icon: MessageSquare,
  },
  {
    label: "Profile",
    href: "/dashboard/profile",
    icon: Settings,
  },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const filteredNav = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm group-hover:bg-indigo-700 transition-colors">
            <FlaskConical size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm leading-tight">
              ResearchHub
            </p>
            <p className="text-xs text-slate-500">University Platform</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {filteredNav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-indigo-50 text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon
                  size={18}
                  className={isActive ? "text-indigo-600" : "text-slate-400"}
                />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Professor quick action */}
        {user?.role === "professor" && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Quick Actions
            </p>
            <Link
              href="/dashboard/my-projects/new"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <Plus size={18} />
              New Project
            </Link>
          </div>
        )}
      </nav>

      {/* User footer */}
      {user && (
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <Avatar name={user.name} src={user.avatar} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user.name}
              </p>
              <p className="text-xs text-slate-500 capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
