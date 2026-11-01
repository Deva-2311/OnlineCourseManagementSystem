"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Mail, Loader2, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please provide a valid university or personal email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Simulate/call reset request
      await new Promise((resolve) => setTimeout(resolve, 800));
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setError(msg || "Failed to process recovery request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-surface-container-lowest border-outline-variant/50 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Mail className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Reset Account Password</CardTitle>
          <p className="text-on-surface-variant mt-2 text-xs sm:text-sm">
            Enter your registered email address and we will dispatch a secure reset verification link.
          </p>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {error && (
            <div className="p-3 rounded-lg bg-error-container/20 border border-error/30 text-error flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 space-y-3 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="font-semibold text-sm">Recovery Link Dispatched</h4>
              <p className="text-xs leading-relaxed">
                If an account exists for <strong className="font-mono">{email}</strong>, you will receive password reset instructions shortly.
              </p>
              <div className="pt-2">
                <Link
                  href={`/reset-password?email=${encodeURIComponent(email)}`}
                  className="inline-flex items-center justify-center w-full py-2 px-3 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 transition-colors"
                >
                  Enter Verification Code / Token
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="recovery-email" className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  Registered Email Address
                </label>
                <Input
                  id="recovery-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="scholar@ocms.com"
                  required
                  disabled={loading}
                  className="bg-surface border-outline-variant/60"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container font-semibold cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    <span>Sending Recovery Link…</span>
                  </>
                ) : (
                  <span>Send Recovery Instructions</span>
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
            <span>Return to Login</span>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
