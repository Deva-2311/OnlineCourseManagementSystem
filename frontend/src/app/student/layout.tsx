"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { BookOpen, Trophy, PieChart, Activity, LogOut, Home } from "lucide-react";
import NotificationBell from "@/components/layout/NotificationBell";
import { getStoredUser, apiLogout } from "@/lib/api";
import { User } from "@/types";

function StudentLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(() => (typeof window !== "undefined" ? getStoredUser() : null));

  useEffect(() => {
    const updateUser = () => {
      setUser(getStoredUser());
    };
    window.addEventListener("auth-change", updateUser);
    window.addEventListener("storage", updateUser);
    return () => {
      window.removeEventListener("auth-change", updateUser);
      window.removeEventListener("storage", updateUser);
    };
  }, []);

  const handleLogout = async () => {
    await apiLogout();
    router.push("/");
  };

  const getInitials = (name?: string) => {
    if (!name || name === "Student" || name === "User") return "ST";
    return name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const navLinks = [
    { href: "/student", label: "Dashboard", icon: PieChart },
    { href: "/student/enrollments", label: "My Enrollments", icon: BookOpen },
    { href: "/student/learning-summary", label: "Learning Summary", icon: Activity },
    { href: "/courses", label: "Browse Courses", icon: BookOpen },
    { href: "/student/certificates", label: "Certificates", icon: Trophy },
    { href: "/student/notifications", label: "Notifications", icon: null, materialIcon: "notifications" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col">
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-bold text-xl text-blue-600 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[24px]">school</span>
              <span>OCMS</span>
            </Link>
            <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
              Student
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
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {Icon ? (
                  <Icon className="w-4 h-4" />
                ) : (
                  <span className="material-symbols-outlined text-[18px]">{item.materialIcon}</span>
                )}
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-100">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-md text-sm font-medium transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>University Portal</span>
            </Link>
          </div>
        </nav>

        {/* User profile & Logout footer in sidebar */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {getInitials(user?.name)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{user?.name || "Student"}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Sign Out"
              type="button"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
          <h1 className="font-semibold text-slate-800 text-sm md:text-base">Student Portal Workspace</h1>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-xs">
              {getInitials(user?.name)}
            </div>
          </div>
        </header>
        <div className="p-6 flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 text-slate-400">Loading student workspace...</div>}>
      <StudentLayoutContent>{children}</StudentLayoutContent>
    </Suspense>
  );
}
