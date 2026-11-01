"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRegister, apiLogin } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AlertCircle, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STUDENT" | "INSTRUCTOR">("STUDENT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) {
      setError("Full name must be at least 2 characters long.");
      return;
    }

    if (!email.trim()) {
      setError("Please provide a valid email address.");
      return;
    }

    // Password validation rule
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()[\]{}|;:,.<>~+=-])[A-Za-z\d@$!%*?&^#()[\]{}|;:,.<>~+=-]{8,}$/;
    if (!passwordRegex.test(password)) {
      setError("Password must contain at least 8 characters, including 1 uppercase, 1 lowercase, 1 number, and 1 special character (e.g. Pass123!).");
      return;
    }

    try {
      setLoading(true);
      await apiRegister({
        fullName,
        email,
        password,
        role,
      });

      // Automatically log the newly registered user in
      const loginRes = await apiLogin(email, password);
      setSuccess(true);

      setTimeout(() => {
        if (loginRes.user?.role === "INSTRUCTOR") {
          router.push("/instructor");
        } else {
          router.push("/student");
        }
      }, 500);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setError(msg || "Failed to create account. Email may already be registered.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 py-8">
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
          <CardTitle className="text-xl font-bold text-slate-900">Create your learning account</CardTitle>
          <p className="text-sm text-slate-500 mt-1">
            Join the academic platform to enroll, teach, and certify
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
                <span>Account created! Redirecting to workspace...</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="name-input">
                Full Name
              </label>
              <Input
                id="name-input"
                placeholder="Dr. Jane Smith or Alex Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading || success}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="email-input">
                Email Address
              </label>
              <Input
                id="email-input"
                type="email"
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || success}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700" htmlFor="password-input">
                Password
              </label>
              <Input
                id="password-input"
                type="password"
                placeholder="At least 8 chars with uppercase, number & symbol"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || success}
                required
                autoComplete="new-password"
              />
              <span className="text-[11px] text-slate-500 block">
                Must include 1 uppercase, 1 lowercase, 1 number, and 1 special char.
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-sm font-medium text-slate-700 block">Account Role:</label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    role === "STUDENT"
                      ? "border-blue-600 bg-blue-50/50 text-blue-900"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="STUDENT"
                    checked={role === "STUDENT"}
                    onChange={() => setRole("STUDENT")}
                    className="accent-blue-600"
                  />
                  <div>
                    <span className="text-sm font-semibold block">Student</span>
                    <span className="text-[11px] text-slate-500 block">Take courses & earn certs</span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    role === "INSTRUCTOR"
                      ? "border-blue-600 bg-blue-50/50 text-blue-900"
                      : "border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="INSTRUCTOR"
                    checked={role === "INSTRUCTOR"}
                    onChange={() => setRole("INSTRUCTOR")}
                    className="accent-blue-600"
                  />
                  <div>
                    <span className="text-sm font-semibold block">Instructor</span>
                    <span className="text-[11px] text-slate-500 block">Author & manage courses</span>
                  </div>
                </label>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-medium"
              disabled={loading || success}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-slate-100 pt-4 pb-4">
          <p className="text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-600 font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
