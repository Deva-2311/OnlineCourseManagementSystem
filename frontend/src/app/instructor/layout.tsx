"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { BookOpen, PieChart, BarChart3, LogOut, Home } from "lucide-react";
import { getStoredUser, apiLogout } from "@/lib/api";
import { User } from "@/types";

function InstructorLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(() =>
    typeof window !== "undefined" ? getStoredUser() : null
  );

  useEffect(() => {
    const handleAuthChange = () => setUser(getStoredUser());
    window.addEventListener("auth-change", handleAuthChange);
    return () => window.removeEventListener("auth-change", handleAuthChange);
  }, []);

  const handleLogout = async () => {
    await apiLogout();
    router.push("/");
  };

  const getInitials = (name?: string) => {
    if (!name) return "IN";
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const navLinks = [
    { href: "/instructor", label: "Dashboard & Courses", icon: PieChart },
    { href: "/instructor/analytics", label: "Analytics & Reports", icon: BarChart3 },
    { href: "/courses", label: "Public Catalogue", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col">
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-bold text-xl text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[24px] text-indigo-400">school</span>
              <span>OCMS</span>
            </Link>
            <span className="text-[10px] font-semibold px-2 py-0.5 bg-indigo-900/50 text-indigo-400 rounded-full">
              Instructor
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
        <div className="p-4 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {getInitials(user?.name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name || "Instructor"}</p>
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
          <h1 className="font-semibold text-slate-800 text-sm md:text-base">Course Authoring &amp; Instruction</h1>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold text-xs">
              {getInitials(user?.name)}
            </div>
          </div>
        </header>
        <div className="p-6 flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}

export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-slate-400">Loading instructor portal...</div>}>
      <InstructorLayoutContent>{children}</InstructorLayoutContent>
    </Suspense>
  );
}
