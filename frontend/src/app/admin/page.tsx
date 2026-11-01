"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  CheckCircle,
  XCircle,
  Clock,
  BookOpen,
  Users,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Filter,
  X,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/api";
import { Course } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface OverviewMetrics {
  totalUsers: number;
  studentCount: number;
  instructorCount: number;
  adminCount: number;
  totalCourses: number;
  publishedCourses: number;
  pendingCourses: number;
  draftCourses: number;
  rejectedCourses: number;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  totalCertificates: number;
  revenue: { currency: string; total: number }[];
  completionRate: number;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [pendingCourses, setPendingCourses] = useState<Course[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allCoursesTotal, setAllCoursesTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab: "PENDING" or "ALL"
  const [viewTab, setViewTab] = useState<"PENDING" | "ALL">("PENDING");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Moderation action states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Rejection modal
  const [rejectingCourse, setRejectingCourse] = useState<Course | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingRejection, setSubmittingRejection] = useState(false);
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/analytics/overview`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch {
      // Non-fatal
    }
  }, []);

  const fetchPendingCourses = useCallback(async () => {
    try {
      setPendingLoading(true);
      const res = await fetch(`${API_BASE}/admin/courses/pending?page=1&limit=50`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load moderation queue");
      const resData = await res.json();
      setPendingCourses(Array.isArray(resData.data) ? resData.data : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load moderation queue");
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const fetchAllCourses = useCallback(async () => {
    try {
      const query = statusFilter ? `?status=${statusFilter}&limit=50` : `?limit=50`;
      const res = await fetch(`${API_BASE}/admin/courses${query}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const resData = await res.json();
        setAllCourses(Array.isArray(resData.data) ? resData.data : []);
        setAllCoursesTotal(resData.meta?.total || 0);
      }
    } catch {
      // Non-fatal
    }
  }, [statusFilter]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchOverview(), fetchPendingCourses(), fetchAllCourses()]);
    setLoading(false);
  }, [fetchOverview, fetchPendingCourses, fetchAllCourses]);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const [overviewRes, pendingRes, allRes] = await Promise.allSettled([
          fetch(`${API_BASE}/admin/analytics/overview`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/admin/courses/pending?page=1&limit=50`, { headers: getAuthHeaders() }),
          fetch(`${API_BASE}/admin/courses${statusFilter ? `?status=${statusFilter}&limit=50` : `?limit=50`}`, { headers: getAuthHeaders() }),
        ]);
        if (ignore) return;
        if (overviewRes.status === "fulfilled" && overviewRes.value.ok) {
          const data = await overviewRes.value.json();
          setMetrics(data);
        }
        if (pendingRes.status === "fulfilled" && pendingRes.value.ok) {
          const resData = await pendingRes.value.json();
          setPendingCourses(Array.isArray(resData.data) ? resData.data : []);
        }
        if (allRes.status === "fulfilled" && allRes.value.ok) {
          const resData = await allRes.value.json();
          setAllCourses(Array.isArray(resData.data) ? resData.data : []);
          setAllCoursesTotal(resData.meta?.total || 0);
        }
      } catch (err: unknown) {
        if (!ignore) setError(err instanceof Error ? err.message : "Failed to load admin metrics");
      } finally {
        if (!ignore) {
          setLoading(false);
          setPendingLoading(false);
        }
      }
    };
    load();
    return () => {
      ignore = true;
    };
  }, [statusFilter]);

  // Approve course
  const handleApprove = async (courseId: string, title: string) => {
    try {
      setActionLoadingId(courseId);
      setToastMessage(null);
      const res = await fetch(`${API_BASE}/admin/courses/${courseId}/approve`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to approve course");
      }
      setToastMessage({
        text: `"${title}" has been approved and published to the public catalog!`,
        type: "success",
      });
      await refreshAll();
    } catch (err: unknown) {
      setToastMessage({ text: err instanceof Error ? err.message : "Failed to approve course", type: "error" });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Reject course
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingCourse) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      setRejectionError("Please provide clear feedback for the instructor (at least 5 characters).");
      return;
    }

    try {
      setSubmittingRejection(true);
      setRejectionError(null);
      const res = await fetch(`${API_BASE}/admin/courses/${rejectingCourse.id}/reject`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to submit course rejection");
      }

      setToastMessage({
        text: `Course proposal rejected with revision instructions for instructor.`,
        type: "success",
      });
      setRejectingCourse(null);
      setRejectionReason("");
      await refreshAll();
    } catch (err: unknown) {
      setRejectionError(err instanceof Error ? err.message : "Failed to submit rejection");
    } finally {
      setSubmittingRejection(false);
    }
  };

  const totalRev = metrics?.revenue?.reduce((acc, r) => acc + (Number(r.total) || 0), 0) || 0;

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Academic Governance Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            <ShieldAlert className="w-4 h-4" />
            <span>Office of the Registrar</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Academic Governance &amp; Moderation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review submitted course proposals, regulate faculty curriculum standards, and oversee platform performance.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={refreshAll}
            disabled={loading}
            className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm transition-colors"
            title="Refresh All Records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/admin/users"
            className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
          >
            Manage Users
          </Link>
          <Link
            href="/admin/audit-logs"
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Audit Logs
          </Link>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium bg-red-50 text-red-800 border border-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action Notification Alert */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm font-medium ${
            toastMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Moderation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Moderation Queue</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-amber-600">
              {metrics ? metrics.pendingCourses : pendingCourses.length}
            </span>
            <span className="text-xs font-medium text-slate-500">pending proposals</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Requires registrar sign-off</p>
          {(metrics?.pendingCourses || pendingCourses.length) > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </div>

        {/* Total Users */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Matriculated Users</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-slate-900">{metrics?.totalUsers || 0}</span>
            <span className="text-xs font-medium text-slate-500">accounts</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {metrics?.studentCount || 0} students • {metrics?.instructorCount || 0} faculty
          </p>
        </div>

        {/* Enrollments & Completion */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Enrollments</span>
            <BookOpen className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-blue-600">{metrics?.totalEnrollments || 0}</span>
            <span className="text-xs font-medium text-slate-500">active/completed</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Completion rate: {metrics?.completionRate || 0}%
          </p>
        </div>

        {/* Verified Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>Platform Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-emerald-600">
              ${totalRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-medium text-slate-500">USD</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">From verified Stripe payments</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewTab("PENDING")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              viewTab === "PENDING"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Pending Review Queue ({pendingCourses.length})</span>
          </button>
          <button
            onClick={() => setViewTab("ALL")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
              viewTab === "ALL"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>All Catalog Courses ({allCoursesTotal || allCourses.length})</span>
          </button>
        </div>

        {viewTab === "ALL" && (
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              <option value="">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="DRAFT">Draft</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        )}
      </div>

      {/* Content for PENDING MODERATION QUEUE */}
      {viewTab === "PENDING" && (
        <div className="space-y-4">
          {pendingLoading ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
              <p className="text-sm">Inspecting pending course submissions...</p>
            </div>
          ) : pendingCourses.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-800">Moderation Queue is Clear</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                All submitted syllabi and course proposals have been reviewed. New submissions from instructors will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {pendingCourses.map((course) => {
                const isActing = actionLoadingId === course.id;
                const priceDisplay = Number(course.price) === 0 ? "Free" : `$${Number(course.price).toFixed(2)}`;

                return (
                  <div key={course.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Awaiting Moderation
                        </span>
                        {course.category && (
                          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded">
                            {typeof course.category === 'object' ? course.category.name : course.category}
                          </span>
                        )}
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded">
                          {course.difficultyLevel}
                        </span>
                        <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded">
                          {priceDisplay}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900">
                        {course.title}
                      </h3>

                      <p className="text-xs text-slate-600 line-clamp-2">
                        {course.shortDescription || course.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                        {course.instructor && (
                          <span className="flex items-center gap-1">
                            <strong>Author:</strong> {course.instructor.name} ({course.instructor.email})
                          </span>
                        )}
                        <span>
                          <strong>Submitted:</strong> {course.createdAt ? new Date(course.createdAt).toLocaleDateString() : "Recently"}
                        </span>
                      </div>
                    </div>

                    {/* Moderation Approval / Rejection Controls */}
                    <div className="flex items-center gap-3 shrink-0 md:border-l md:border-slate-100 md:pl-6">
                      <button
                        onClick={() => handleApprove(course.id, course.title)}
                        disabled={isActing}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{isActing ? "Approving..." : "Approve Course"}</span>
                      </button>

                      <button
                        onClick={() => {
                          setRejectingCourse(course);
                          setRejectionReason("");
                          setRejectionError(null);
                        }}
                        disabled={isActing}
                        className="inline-flex items-center gap-1.5 px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span>Reject with Feedback</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Content for ALL COURSES TAB */}
      {viewTab === "ALL" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Course Title</th>
                  <th className="px-6 py-3.5">Author</th>
                  <th className="px-6 py-3.5">Discipline</th>
                  <th className="px-6 py-3.5">Price</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allCourses.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900 max-w-xs truncate">
                      {c.title}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {c.instructor?.name || "Faculty Member"}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {typeof c.category === 'object' && c.category !== null ? c.category.name : (c.category || "General")}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {Number(c.price) === 0 ? "Free" : `$${Number(c.price).toFixed(2)}`}
                    </td>
                    <td className="px-6 py-4">
                      {c.status === "PUBLISHED" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Published
                        </span>
                      )}
                      {c.status === "PENDING_REVIEW" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Pending Review
                        </span>
                      )}
                      {c.status === "DRAFT" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-300">
                          Draft
                        </span>
                      )}
                      {c.status === "REJECTED" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {c.status === "PENDING_REVIEW" && (
                          <button
                            onClick={() => handleApprove(c.id, c.title)}
                            disabled={actionLoadingId === c.id}
                            className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-semibold hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                        <Link
                          href={`/courses/${c.id}`}
                          className="p-1 text-slate-400 hover:text-slate-700"
                          title="View Course"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection Modal with Feedback */}
      {rejectingCourse && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-lg text-slate-900">Request Revisions</h3>
              </div>
              <button
                onClick={() => setRejectingCourse(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="p-6 space-y-4">
              {rejectionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium">
                  {rejectionError}
                </div>
              )}

              <div>
                <p className="text-xs text-slate-500 mb-1">Target Course Proposal:</p>
                <p className="text-sm font-bold text-slate-900">{rejectingCourse.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Instructor: {rejectingCourse.instructor?.name || "Faculty Member"}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Registrar Feedback <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Specify why this proposal cannot be published yet (e.g., incomplete syllabus, missing video lessons, prerequisite clarification needed)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This explanation will be delivered directly to the instructor so they can revise and re-submit.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRejectingCourse(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRejection}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {submittingRejection ? "Sending Revision..." : "Send Rejection & Feedback"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
