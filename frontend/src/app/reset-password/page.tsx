"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { KeyRound, CheckCircle2, ArrowLeft, Loader2, AlertCircle } from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please confirm your account email address.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please ensure both fields are identical.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Simulate password update
      await new Promise((resolve) => setTimeout(resolve, 900));
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setError(msg || "Failed to update password. Your reset token may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-surface-container-lowest border-outline-variant/50 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 shadow-xs">
            <KeyRound className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Set New Password</CardTitle>
          <p className="text-on-surface-variant mt-2 text-xs sm:text-sm">
            Enter your reset code and specify your new secure credentials.
          </p>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {error && (
            <div className="p-3 rounded-lg bg-error-container/20 border border-error/30 text-error flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 space-y-3 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-base">Password Successfully Updated</h4>
              <p className="text-xs leading-relaxed">
                Your credentials have been securely updated. You may now sign in with your new password.
              </p>
              <div className="pt-2">
                <Button
                  onClick={() => router.push("/login")}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                >
                  Proceed to Login
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Account Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="scholar@ocms.com"
                  required
                  disabled={loading}
                  className="bg-surface border-outline-variant/60 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Reset Token / Security Code
                </label>
                <Input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="e.g. 849201"
                  required
                  disabled={loading}
                  className="bg-surface border-outline-variant/60 font-mono text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  New Password (min 8 chars)
                </label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="bg-surface border-outline-variant/60 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Confirm New Password
                </label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="bg-surface border-outline-variant/60 text-sm"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-semibold cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Updating Password…</span>
                  </>
                ) : (
                  <span>Commit Password Change</span>
                )}
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t border-surface-variant/40 pt-4">
          <Link
            href="/login"
            className="text-xs text-primary font-semibold hover:underline flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Login</span>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
