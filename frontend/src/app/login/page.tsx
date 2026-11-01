"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiLogin } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AlertCircle, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const getSafeRedirect = (role?: string) => {
    // Prevent open redirect attacks: must start with single '/' and not '//'
    if (redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")) {
      // Validate role compatibility with target path
      if (role === "ADMIN" && redirectParam.startsWith("/admin")) return redirectParam;
      if (role === "INSTRUCTOR" && redirectParam.startsWith("/instructor")) return redirectParam;
      if (role === "STUDENT" && (redirectParam.startsWith("/student") || redirectParam.startsWith("/courses"))) {
        return redirectParam;
      }
      if (redirectParam.startsWith("/courses") || redirectParam.startsWith("/verify")) {
        return redirectParam;
      }
    }

    if (role === "ADMIN") return "/admin";
    if (role === "INSTRUCTOR") return "/instructor";
    return "/student";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter both email address and password.");
      return;
    }

    try {
      setLoading(true);
      const res = await apiLogin(email, password);
      setSuccess(true);

      const targetPath = getSafeRedirect(res.user?.role);
      setTimeout(() => {
        router.push(targetPath);
      }, 500);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setError(msg || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md mb-4 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-primary font-bold text-2xl tracking-tight">
          <span className="material-symbols-outlined text-[28px] text-blue-600">school</span>
          <span>OCMS</span>
        </Link>
        <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">
          Online Course Management System
        </p>
      </div>

      <Card className="w-full max-w-md shadow-md border-slate-200">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl font-bold text-slate-900">Sign in to your account</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Access your courses, curriculum, and learning dashboard
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Authenticated successfully! Redirecting...</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="email-input">
                Email Address
              </label>
              <Input
                id="email-input"
                type="email"
                placeholder="name@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || success}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-700" htmlFor="password-input">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || success}
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium"
              disabled={loading || success}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </form>

          {/* Quick Demo Credentials helper */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
            <span className="font-semibold text-slate-600 block mb-1">Standard Admin Credentials:</span>
            <div className="bg-slate-100 p-2 rounded text-[11px] font-mono flex items-center justify-between">
              <span>admin@ocms.com / AdminSecurePass123!</span>
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@ocms.com");
                  setPassword("AdminSecurePass123!");
                }}
                className="text-blue-600 hover:underline font-sans ml-2 text-[10px]"
              >
                Autofill
              </button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-slate-100 pt-4 pb-4">
          <p className="text-sm text-slate-600">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-blue-600 font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-slate-400">Loading sign in...</div>}>
      <LoginForm />
    </Suspense>
  );
}
