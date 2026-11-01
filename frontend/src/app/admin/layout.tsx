"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Users, LayoutGrid, Shield, BarChart3, ClipboardList, LogOut, Home, Folder } from "lucide-react";
import { getStoredUser, apiLogout } from "@/lib/api";
import { User } from "@/types";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(() => (typeof window !== "undefined" ? getStoredUser() : null));

  useEffect(() => {
    const handleAuth = () => setUser(getStoredUser());
    window.addEventListener("auth-change", handleAuth);
    return () => window.removeEventListener("auth-change", handleAuth);
  }, []);

  const handleLogout = async () => {
    await apiLogout();
    router.push("/");
  };

  const getInitials = (name?: string) => {
    if (!name) return "AD";
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const navLinks = [
    { href: "/admin", label: "Dashboard & Queue", icon: LayoutGrid },
    { href: "/admin/analytics", label: "Platform Analytics", icon: BarChart3 },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: ClipboardList },
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/categories", label: "Categories", icon: Folder },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-950 text-slate-300 flex-shrink-0 flex flex-col">
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-bold text-xl text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[24px] text-red-500">shield</span>
              <span>OCMS</span>
            </Link>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-red-900/60 text-red-400 rounded-full tracking-wider">
              ADMIN
            </span>
          </div>
        </div>

        <nav className="p-4 space-y-1 flex-1">
          {navLinks.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
                  isActive
                    ? "bg-slate-800 text-white font-semibold"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-800">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:bg-slate-800/60 hover:text-white rounded-md text-sm font-medium transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>University Portal</span>
            </Link>
          </div>
        </nav>

        {/* User profile & Logout footer in sidebar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-red-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {getInitials(user?.name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name || "Administrator"}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Sign Out"
              type="button"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm md:text-base">
            <Shield className="w-5 h-5 text-red-600" />
            <span>Academic Governance &amp; Administration</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center font-semibold text-xs">
              {getInitials(user?.name)}
            </div>
          </div>
        </header>
        <div className="p-6 flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-slate-400">Loading governance dashboard...</div>}>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}
