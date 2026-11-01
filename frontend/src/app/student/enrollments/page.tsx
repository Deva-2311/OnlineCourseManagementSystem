"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { SafeEnrollmentDto } from "@/types";
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Calendar,
} from "lucide-react";

function EnrollmentsContent() {
  const searchParams = useSearchParams();
  const paymentStatus = searchParams.get("payment");
  const sessionId = searchParams.get("session_id");

  const [enrollments, setEnrollments] = useState<SafeEnrollmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [reconcileMessage, setReconcileMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<SafeEnrollmentDto[]>("/enrollments/me");
      setEnrollments(data || []);
    } catch (err: unknown) {
      const msg = (err as Error)?.message;
      setError(msg || "Failed to load enrollments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      // If returning from Stripe with a session ID, verify and reconcile immediately
      if (paymentStatus === "success" && sessionId) {
        setReconciling(true);
        try {
          await apiFetch("/payments/verify-session", {
            method: "POST",
            body: JSON.stringify({ sessionId }),
          });
          setReconcileMessage("Enrollment successfully verified and activated!");
        } catch {
          // If already reconciled via webhook or session check failed gracefully, continue
        } finally {
          setReconciling(false);
        }
      }

      await fetchEnrollments();
    };

    init();
  }, [paymentStatus, sessionId]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Payment Success Alert */}
      {paymentStatus === "success" && (
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-200/80 shadow-sm backdrop-blur-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    Payment Successful &amp; Enrollment Confirmed!
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    Verified
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Thank you for your enrollment. Your course access has been activated immediately.
                </p>
                {reconciling && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-blue-600 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synchronizing payment authorization with learning ledger...</span>
                  </div>
                )}
                {reconcileMessage && !reconciling && (
                  <p className="text-xs text-emerald-700 font-medium mt-1">
                    ✓ {reconcileMessage}
                  </p>
                )}
                {sessionId && (
                  <div className="text-[11px] text-slate-400 font-mono mt-1">
                    Reference: {sessionId.slice(0, 24)}...
                  </div>
                )}
              </div>
            </div>
            <Link
              href="/student"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors whitespace-nowrap"
            >
              Go to Workspace Dashboard
            </Link>
          </div>
        </div>
      )}

      {/* Payment Cancelled Alert */}
      {paymentStatus === "cancelled" && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <XCircle className="w-6 h-6 text-amber-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold">Payment Checkout Cancelled</h3>
              <p className="text-xs text-amber-700 mt-0.5">
                No charges were deducted from your account. You can complete your enrollment whenever you are ready.
              </p>
            </div>
          </div>
          <Link
            href="/courses"
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors shrink-0"
          >
            Browse Courses
          </Link>
        </div>
      )}

      {/* Page Header */}
      <section className="flex flex-col gap-3 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <Link href="/student" className="hover:text-blue-600 transition-colors">
            Student Workspace
          </Link>
          <span>/</span>
          <span className="text-blue-600">My Enrollments</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <span>My Enrolled Courses</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                {enrollments.length}
              </span>
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">
              Access your enrolled curriculum modules, track lecture completion, and review verified course statuses.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/courses"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Explore More Courses</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Enrollments Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
          <p className="text-sm font-medium">Loading your enrolled coursework...</p>
        </div>
      ) : error ? (
        <div className="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <p className="font-semibold">{error}</p>
          <button
            onClick={fetchEnrollments}
            className="mt-2 text-xs font-bold underline hover:no-underline"
          >
            Retry Loading
          </button>
        </div>
      ) : enrollments.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-bold text-slate-900 text-lg">No Course Enrollments Found</h3>
            <p className="text-xs text-slate-500">
              You have not enrolled in any courses yet. Browse our comprehensive catalog to find courses matching your learning pathway.
            </p>
          </div>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-sm shadow-blue-500/20"
          >
            <span>Browse Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((enr) => {
            const course = enr.course;
            const title = course?.title || "Enrolled Course";
            const catName =
              typeof course?.category === "object"
                ? course?.category?.name
                : course?.category || "Curriculum";

            const isActive = enr.status === "ACTIVE";
            const isCompleted = enr.status === "COMPLETED";

            return (
              <div
                key={enr.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group hover:border-slate-300"
              >
                <div className="p-6 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider truncate max-w-[150px]">
                      {catName}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isCompleted
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {isActive && <ShieldCheck className="w-3 h-3 text-emerald-600" />}
                      {enr.status}
                    </span>
                  </div>

                  <Link href={`/student/course/${enr.courseId}`}>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                      {title}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {course?.shortDescription ||
                      course?.description ||
                      "Course curriculum modules and structured learning materials."}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Enrolled: {new Date(enr.enrolledAt || enr.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      {isActive ? "Ready to study" : isCompleted ? "Finished" : "Action required"}
                    </span>
                    <Link
                      href={`/student/course/${enr.courseId}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-xs"
                    >
                      <span>{isActive ? "Open Course" : "View Details"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function StudentEnrollmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
          <p className="text-sm">Loading enrollments workspace...</p>
        </div>
      }
    >
      <EnrollmentsContent />
    </Suspense>
  );
}
