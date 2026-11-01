"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import NotificationBell from "./NotificationBell";
import { getStoredUser, getAuthToken, apiLogout } from "@/lib/api";
import { User } from "@/types";
import {
  LogOut,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Menu,
  X,
  Bell,
  CheckCircle,
  Compass,
  FolderTree,
} from "lucide-react";

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const syncAuth = () => {
      setHasToken(!!getAuthToken());
      setUser(getStoredUser());
    };
    syncAuth();
    window.addEventListener("auth-change", syncAuth);
    return () => window.removeEventListener("auth-change", syncAuth);
  }, []);

  const handleLogout = async () => {
    await apiLogout();
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    router.push("/");
  };

  const getDashboardHref = () => {
    if (!user) return "/login";
    if (user.role === "ADMIN") return "/admin";
    if (user.role === "INSTRUCTOR") return "/instructor";
    return "/student";
  };

  const getDashboardLabel = () => {
    if (!user) return "Dashboard";
    if (user.role === "ADMIN") return "Admin Dashboard";
    if (user.role === "INSTRUCTOR") return "Instructor Studio";
    return "Student Workspace";
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-surface-container-lowest/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-variant/40">
      <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand Crest & Title */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[20px]">school</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm tracking-tight text-primary leading-none font-bold">
                OCMS
              </span>
              <span className="font-label-sm text-[10px] uppercase tracking-wider text-on-surface-variant font-medium">
                University Portal
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-5 text-sm" aria-label="Main Navigation">
            <Link
              href="/courses"
              className="text-on-surface-variant hover:text-primary transition-colors font-medium flex items-center gap-1.5"
            >
              <Compass className="w-4 h-4 text-primary/70" />
              <span>Explore Courses</span>
            </Link>
            <Link
              href="/categories"
              className="text-on-surface-variant hover:text-primary transition-colors font-medium flex items-center gap-1.5"
            >
              <FolderTree className="w-4 h-4 text-primary/70" />
              <span>Categories</span>
            </Link>
            <Link
              href="/verify"
              className="text-on-surface-variant hover:text-primary transition-colors font-medium flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4 text-primary/70" />
              <span>Verify Credential</span>
            </Link>

            {hasToken && user && (
              <>
                <div className="h-4 w-px bg-surface-variant" />
                <Link
                  href={getDashboardHref()}
                  className="text-primary hover:text-primary-container transition-colors font-semibold flex items-center gap-1.5"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>{getDashboardLabel()}</span>
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Right Session Controls */}
        <div className="flex items-center gap-3">
          {hasToken && user ? (
            <>
              {/* Role badge */}
              <span
                className={`hidden sm:inline-flex px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                  user.role === "ADMIN"
                    ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                    : user.role === "INSTRUCTOR"
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"
                }`}
              >
                {user.role}
              </span>

              {/* Notification Bell */}
              <NotificationBell />

              {/* User Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  id="user-menu-btn"
                  aria-label="User profile menu"
                  aria-expanded={dropdownOpen}
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-semibold text-xs shadow-sm hover:ring-2 hover:ring-primary/40 transition-all cursor-pointer"
                  title={user.name || user.email}
                >
                  {getInitials(user.name)}
                </button>

                {dropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-xl bg-surface shadow-xl border border-outline-variant/60 py-2 z-50 text-sm animate-in fade-in duration-100"
                    onMouseLeave={() => setDropdownOpen(false)}
                  >
                    <div className="px-4 py-2 border-b border-surface-variant/40">
                      <p className="font-semibold text-on-surface truncate">{user.name}</p>
                      <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
                    </div>

                    <Link
                      href={getDashboardHref()}
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-on-surface hover:bg-surface-container transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-primary" />
                      <span>{getDashboardLabel()}</span>
                    </Link>

                    {user.role === "STUDENT" && (
                      <>
                        <Link
                          href="/student/certificates"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-on-surface hover:bg-surface-container transition-colors"
                        >
                          <GraduationCap className="w-4 h-4 text-secondary" />
                          <span>My Certificates</span>
                        </Link>
                        <Link
                          href="/student/learning-summary"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-on-surface hover:bg-surface-container transition-colors"
                        >
                          <BookOpen className="w-4 h-4 text-tertiary" />
                          <span>Learning Summary</span>
                        </Link>
                        <Link
                          href="/student/notifications"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-on-surface hover:bg-surface-container transition-colors"
                        >
                          <Bell className="w-4 h-4 text-primary" />
                          <span>Notifications</span>
                        </Link>
                      </>
                    )}

                    <div className="my-1 border-t border-surface-variant/40" />

                    <button
                      type="button"
                      id="logout-btn"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-error hover:bg-error-container/20 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            id="mobile-nav-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-on-surface hover:bg-surface-container transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="md:hidden bg-surface-container-lowest border-b border-surface-variant/60 px-4 pt-2 pb-6 space-y-3 animate-in slide-in-from-top-2 duration-150"
        >
          <div className="flex flex-col space-y-1">
            <Link
              href="/courses"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container font-medium text-sm"
            >
              <Compass className="w-4 h-4 text-primary" />
              <span>Explore Courses</span>
            </Link>
            <Link
              href="/categories"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container font-medium text-sm"
            >
              <FolderTree className="w-4 h-4 text-primary" />
              <span>Categories</span>
            </Link>
            <Link
              href="/verify"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container font-medium text-sm"
            >
              <CheckCircle className="w-4 h-4 text-primary" />
              <span>Verify Credential</span>
            </Link>

            {hasToken && user ? (
              <>
                <div className="my-2 border-t border-surface-variant/40" />
                <div className="px-3 py-1 text-xs font-semibold uppercase text-on-surface-variant">
                  Workspace ({user.role})
                </div>
                <Link
                  href={getDashboardHref()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-primary bg-primary/5 hover:bg-primary/10 font-semibold text-sm"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>{getDashboardLabel()}</span>
                </Link>

                {user.role === "STUDENT" && (
                  <>
                    <Link
                      href="/student/certificates"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container text-sm"
                    >
                      <GraduationCap className="w-4 h-4 text-secondary" />
                      <span>My Certificates</span>
                    </Link>
                    <Link
                      href="/student/learning-summary"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container text-sm"
                    >
                      <BookOpen className="w-4 h-4 text-tertiary" />
                      <span>Learning Summary</span>
                    </Link>
                    <Link
                      href="/student/notifications"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-on-surface hover:bg-surface-container text-sm"
                    >
                      <Bell className="w-4 h-4 text-primary" />
                      <span>Notifications</span>
                    </Link>
                  </>
                )}

                <div className="my-2 border-t border-surface-variant/40" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-error hover:bg-error-container/20 text-sm font-medium text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out ({user.name})</span>
                </button>
              </>
            ) : (
              <div className="pt-3 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 rounded-lg text-sm font-medium border border-outline-variant/60 text-on-surface hover:bg-surface-container"
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 rounded-lg text-sm font-semibold bg-primary text-on-primary hover:bg-primary-container"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
