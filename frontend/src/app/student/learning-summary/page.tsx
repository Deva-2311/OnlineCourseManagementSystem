'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { apiFetch, getAuthToken } from '@/lib/api';

function MetricCard({
  label,
  value,
  sub,
  color = 'text-blue-600',
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      {icon && (
        <span className={`material-symbols-outlined text-[28px] opacity-80 ${color}`}>
          {icon}
        </span>
      )}
    </div>
  );
}

// Simple CSS bar chart
function ActivityChart({ data }: { data: { day: string; lessonsCompleted: number }[] }) {
  const max = Math.max(...data.map((d) => d.lessonsCompleted), 1);
  if (data.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-6 text-center">
        No completed lesson activity recorded in the past 30 days.
      </p>
    );
  }
  return (
    <div className="flex items-end gap-1.5 h-32 overflow-x-auto pt-4 pb-2 px-1">
      {data.map((d) => (
        <div key={d.day} className="flex flex-col items-center gap-1 shrink-0 group" title={`${d.day}: ${d.lessonsCompleted} lessons`}>
          <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
            {d.lessonsCompleted}
          </span>
          <div
            className="w-4 rounded-t bg-blue-600 hover:bg-blue-500 transition-colors"
            style={{ height: `${Math.max((d.lessonsCompleted / max) * 96, 4)}px` }}
          />
          <span className="text-[9px] text-slate-400 rotate-45 origin-left mt-1">{d.day.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

interface EnrolledCourseProgress {
  enrollmentId: string;
  courseId: string;
  title: string;
  status: string;
  progressPercentage: number;
  enrolledAt?: string;
}

interface RecentQuizAttempt {
  attemptId: string;
  quizTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  isPassed: boolean;
  submittedAt: string;
}

interface ActivityItem {
  day: string;
  lessonsCompleted: number | string;
}

interface CertificateSummaryItem {
  id: string;
  courseTitle: string;
  certificateNumber: string;
  issuedAt: string;
}

interface LearningSummaryData {
  enrollments?: { total: number; completed: number; active: number; completionRatePercent?: number };
  lessons?: { completed: number; total: number; completedTotal?: number };
  quizzes?: {
    passed: number;
    total: number;
    passRatePercent?: number;
    averageScorePercent?: number | null;
    passedAttempts?: number;
    totalAttempts?: number;
  };
  certificates?: { count: number; total?: number; items: CertificateSummaryItem[] };
  courses?: EnrolledCourseProgress[];
  recentQuizzes?: RecentQuizAttempt[];
  recentActivity?: ActivityItem[];
}

export default function StudentLearningSummaryPage() {
  const [data, setData] = useState<LearningSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await apiFetch<LearningSummaryData>('/student/learning-summary');
      setData(summary);
    } catch (e: unknown) {
      const msg = (e as Error)?.message;
      setError(msg || 'Unable to load learning summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    apiFetch<LearningSummaryData>('/student/learning-summary')
      .then((summary) => {
        if (active) {
          setData(summary);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!active) return;
        const msg = (e as Error)?.message;
        setError(msg || 'Unable to load learning summary');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-3">
        <span className="material-symbols-outlined text-[36px] animate-spin">progress_activity</span>
        <span className="font-medium">Loading your learning summary…</span>
      </div>
    );
  }

  if (error) {
    const isAuthError =
      error.includes('401') ||
      error.toLowerCase().includes('unauthorized') ||
      error.toLowerCase().includes('authentication') ||
      error.toLowerCase().includes('token') ||
      !getAuthToken();

    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-base">
            {isAuthError ? 'Authentication Required' : 'Unable to load learning summary'}
          </p>
          <p className="text-xs text-red-600 mt-1">
            {isAuthError
              ? 'Your session has expired or you are not logged in. Please sign in to view your learning progress.'
              : error}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAuthError && (
            <Link
              href="/login?redirect=/student/learning-summary"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              Sign In
            </Link>
          )}
          <button
            onClick={loadData}
            className="px-3.5 py-2 bg-red-100 text-red-800 rounded-lg text-xs font-semibold hover:bg-red-200 transition-colors"
            type="button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { enrollments, lessons, quizzes, certificates, courses, recentQuizzes, recentActivity } = data || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-[28px]">insights</span>
            My Learning Summary
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Personal learning overview, verified course completions, and assessment records.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/student"
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Go to My Workspace
          </Link>
          <Link
            href="/student/certificates"
            className="px-3.5 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            View Certificates
          </Link>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Enrolled Courses"
          value={enrollments?.total ?? 0}
          sub={`${enrollments?.completed ?? 0} completed (${enrollments?.completionRatePercent ?? (enrollments?.total ? Math.round(((enrollments?.completed || 0) / enrollments.total) * 100) : 0)}%)`}
          color="text-blue-600"
          icon="menu_book"
        />
        <MetricCard
          label="Lessons Completed"
          value={lessons?.completedTotal ?? lessons?.completed ?? 0}
          sub="across all curriculum modules"
          color="text-emerald-600"
          icon="task_alt"
        />
        <MetricCard
          label="Quiz Pass Rate"
          value={`${quizzes?.passRatePercent ?? (quizzes?.total ? Math.round(((quizzes?.passed || 0) / quizzes.total) * 100) : 0)}%`}
          sub={quizzes?.averageScorePercent !== undefined && quizzes?.averageScorePercent !== null ? `Avg score: ${quizzes.averageScorePercent}%` : `${quizzes?.passedAttempts ?? quizzes?.passed ?? 0}/${quizzes?.totalAttempts ?? quizzes?.total ?? 0} passed`}
          color="text-indigo-600"
          icon="quiz"
        />
        <MetricCard
          label="Certificates"
          value={certificates?.total ?? certificates?.count ?? 0}
          sub="verified credentials earned"
          color="text-amber-600"
          icon="workspace_premium"
        />
      </div>

      {/* Enrolled Courses with Progress */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Enrolled Courses Progress</h2>
            <p className="text-xs text-slate-500">Track your progress toward completing each course</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">{courses?.length ?? 0} Courses</span>
        </div>

        {!courses || courses.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            You are not enrolled in any courses yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((c: EnrolledCourseProgress) => (
              <div
                key={c.enrollmentId}
                className="border border-slate-200 rounded-xl p-4 hover:border-blue-200 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-800 text-sm line-clamp-1">{c.title}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                        c.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Progress</span>
                      <span className="font-semibold text-slate-700">{c.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          c.status === 'COMPLETED' ? 'bg-green-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(c.progressPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Enrolled {c.enrolledAt ? new Date(c.enrolledAt).toLocaleDateString() : 'recently'}
                  </span>
                  <Link
                    href={`/student/course/${c.courseId}`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Continue Course →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quiz Performance History & 30-Day Activity Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Quizzes */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Recent Quiz Attempts</h2>
              <p className="text-xs text-slate-500">Your latest assessment submissions</p>
            </div>
            <span className="text-xs text-slate-400 font-medium">{recentQuizzes?.length ?? 0} Attempts</span>
          </div>

          {!recentQuizzes || recentQuizzes.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No quiz submissions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="text-left pb-2 font-semibold">Quiz</th>
                    <th className="text-center pb-2 font-semibold">Score</th>
                    <th className="text-center pb-2 font-semibold">Result</th>
                    <th className="text-right pb-2 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentQuizzes.map((q: RecentQuizAttempt) => (
                    <tr key={q.attemptId} className="hover:bg-slate-50">
                      <td className="py-2.5 font-medium text-slate-800 max-w-[160px] truncate">{q.quizTitle}</td>
                      <td className="py-2.5 text-center font-mono">
                        {q.score}/{q.maxScore} ({Math.round(q.percentage)}%)
                      </td>
                      <td className="py-2.5 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            q.isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {q.isPassed ? 'PASSED' : 'FAILED'}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-400">
                        {new Date(q.submittedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 30-Day Activity Trend */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="mb-2">
            <h2 className="text-base font-bold text-slate-800">Learning Activity (Last 30 Days)</h2>
            <p className="text-xs text-slate-500">Lessons completed by day</p>
          </div>
          <ActivityChart
            data={(recentActivity || []).map((r: ActivityItem) => ({
              day: r.day,
              lessonsCompleted: Number(r.lessonsCompleted),
            }))}
          />
        </div>
      </div>

      {/* Certificates Earned */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Earned Certificates</h2>
            <p className="text-xs text-slate-500">Official course completion credentials issued to you</p>
          </div>
          <Link
            href="/student/certificates"
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Manage Credentials →
          </Link>
        </div>

        {!certificates?.items || certificates.items.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-sm">
            No certificates earned yet. Complete 100% of curriculum lessons to receive your certificate!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {certificates.items.map((cert: CertificateSummaryItem) => (
              <div
                key={cert.id}
                className="border border-amber-200 bg-amber-50/40 rounded-xl p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-amber-600 text-[22px]">workspace_premium</span>
                    <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
                      Verified Certificate
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-800 text-sm line-clamp-2">{cert.courseTitle}</h4>
                  <p className="font-mono text-[11px] text-slate-500 mt-1 select-all">{cert.certificateNumber}</p>
                </div>
                <div className="mt-4 pt-2 border-t border-amber-100 flex items-center justify-between text-xs text-slate-400">
                  <span>Issued {new Date(cert.issuedAt).toLocaleDateString()}</span>
                  <Link
                    href={`/student/certificates?id=${cert.id}`}
                    className="text-blue-600 font-medium hover:underline text-[11px]"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
