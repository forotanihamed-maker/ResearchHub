/*src\components\layout\sidebar.tsx */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
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
  X,
} from "lucide-react";
import { ShieldCheck } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: ("professor" | "student" | "admin")[];
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
    roles: ["student"],
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
    roles: ["professor"],
  },
  {
    label: "Profile",
    href: "/dashboard/profile",
    icon: Settings,
    roles: ["professor", "student"],
  },
  {
    label: "Admin Panel",
    href: "/dashboard/admin",
    icon: ShieldCheck,
    roles: ["admin"],
  },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { isOpen, close } = useSidebar();

  const filteredNav = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <>
      {/* Mobile/tablet backdrop — click to close the drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-50",
          "transition-transform duration-200 ease-in-out",
          "lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
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
          <button
            onClick={close}
            className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
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
    </>
  );
}
