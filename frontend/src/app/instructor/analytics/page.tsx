'use client';

import { useEffect, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function auth(): Record<string, string> {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('token')) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function MetricCard({
  label,
  value,
  sub,
  color = 'text-blue-600',
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

interface CourseAnalyticsItem {
  courseId: string;
  courseTitle?: string;
  title?: string;
  totalEnrollments: number;
  completedEnrollments: number;
  activeEnrollments: number;
  quizAttempts: number;
  passedQuizzes?: number;
  averageQuizScorePercent: number | null;
  completionRatePercent: number;
  status: string;
}

interface InstructorAnalyticsSummary {
  totalEnrollments: number;
  completedEnrollments: number;
  completionRatePercent: number;
  totalQuizAttempts: number;
}

interface InstructorAnalyticsData {
  data: CourseAnalyticsItem[];
  summary?: InstructorAnalyticsSummary;
}

interface InstructorCourseDetail {
  courseId?: string;
  title?: string;
  course: {
    id: string;
    title: string;
    status: string;
    price: number;
    currency: string;
    createdAt: string;
  };
  enrollments: {
    total: number;
    active: number;
    completed: number;
    completionRatePercent: number;
  };
  lessons: {
    totalLessons: number;
    completedProgressRecords: number;
    completionRatePercent: number;
  };
  quizzes: {
    totalQuizzes: number;
    totalAttempts: number;
    passRatePercent: number;
    averageScorePercent: number | null;
    scoreDistribution?: {
      failing: number;
      average: number;
      good: number;
      excellent: number;
    };
  };
}

export default function InstructorAnalyticsPage() {
  const [data, setData] = useState<InstructorAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected course drill-down detail
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseDetail, setCourseDetail] = useState<InstructorCourseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}/instructor/analytics`, { headers: auth() })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setData)
      .catch((e: unknown) => setError((e as Error)?.message || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`${API}/instructor/analytics`, { headers: auth() })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (active) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (active) setError((e as Error)?.message || 'Failed to load analytics');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function exportCsv() {
    fetch(`${API}/instructor/analytics/export/courses`, { headers: auth() })
      .then((r) => {
        if (!r.ok) throw new Error(`Export failed: ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `my-courses-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((err) => {
        alert(err.message || 'Export failed');
      });
  }

  async function openCourseDetail(courseId: string) {
    setSelectedCourseId(courseId);
    setDetailLoading(true);
    setDetailError(null);
    setCourseDetail(null);
    try {
      const res = await fetch(`${API}/instructor/analytics/courses/${courseId}`, {
        headers: auth(),
      });
      if (!res.ok) throw new Error(`Failed to load details (${res.status})`);
      setCourseDetail(await res.json());
    } catch (err: unknown) {
      setDetailError((err as Error)?.message || 'Failed to load course details');
    } finally {
      setDetailLoading(false);
    }
  }

  const courses: CourseAnalyticsItem[] = data?.data ?? [];
  const summary = data?.summary;

  const totalEnrollments = summary?.totalEnrollments ?? courses.reduce((s: number, c: CourseAnalyticsItem) => s + c.totalEnrollments, 0);
  const totalCompleted = summary?.completedEnrollments ?? courses.reduce((s: number, c: CourseAnalyticsItem) => s + c.completedEnrollments, 0);
  const completionRate = summary?.completionRatePercent ?? (courses.length > 0
    ? Math.round((totalCompleted / (totalEnrollments || 1)) * 10000) / 100
    : 0);
  const totalQuizAttempts = summary?.totalQuizAttempts ?? courses.reduce((s: number, c: CourseAnalyticsItem) => s + c.quizAttempts, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-3">
        <span className="material-symbols-outlined text-[36px] animate-spin">progress_activity</span>
        <span className="font-medium">Loading instructor analytics…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 text-sm flex items-center justify-between">
        <div>
          <p className="font-semibold">Failed to load analytics</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
        <button
          onClick={loadData}
          className="px-3 py-1.5 bg-red-100 text-red-800 rounded text-xs font-semibold hover:bg-red-200"
          type="button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-600 text-[28px]">bar_chart</span>
            Instructor Analytics & Course Reports
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Aggregated performance metrics scoped strictly to your authored courses. Student privacy is preserved.
          </p>
        </div>
        <button
          id="export-instructor-csv"
          onClick={exportCsv}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm self-start sm:self-auto"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">download</span>
          Export Courses CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Authored Courses" value={courses.length} color="text-slate-800" />
        <MetricCard label="Total Enrollments" value={totalEnrollments} color="text-blue-600" />
        <MetricCard label="Course Completions" value={totalCompleted} color="text-green-600" />
        <MetricCard
          label="Overall Completion Rate"
          value={`${completionRate}%`}
          color="text-indigo-600"
          sub={`${totalQuizAttempts} total quiz attempts`}
        />
      </div>

      {/* Course Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800">Course Breakdown</h2>
            <p className="text-xs text-slate-500">
              Select any course to view detailed lesson completion and quiz score distributions.
            </p>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <span className="material-symbols-outlined text-[48px] opacity-30">menu_book</span>
            <p className="text-sm">You do not have any courses created yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Course Title</th>
                  <th className="text-center px-4 py-3 font-semibold">Status</th>
                  <th className="text-right px-4 py-3 font-semibold">Enrollments</th>
                  <th className="text-right px-4 py-3 font-semibold">Active</th>
                  <th className="text-right px-4 py-3 font-semibold">Completed</th>
                  <th className="text-right px-4 py-3 font-semibold">Completion %</th>
                  <th className="text-right px-4 py-3 font-semibold">Quiz Attempts</th>
                  <th className="text-right px-4 py-3 font-semibold">Avg Quiz Score</th>
                  <th className="text-right px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.map((c: CourseAnalyticsItem) => (
                  <tr key={c.courseId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px] truncate">{c.title}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          c.status === 'PUBLISHED'
                            ? 'bg-green-100 text-green-700'
                            : c.status === 'PENDING_REVIEW'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{c.totalEnrollments}</td>
                    <td className="px-4 py-3 text-right text-blue-600">{c.activeEnrollments}</td>
                    <td className="px-4 py-3 text-right text-green-600">{c.completedEnrollments}</td>
                    <td className="px-4 py-3 text-right font-semibold text-indigo-600">{c.completionRatePercent}%</td>
                    <td className="px-4 py-3 text-right text-slate-600">{c.quizAttempts}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {c.averageQuizScorePercent !== null ? `${c.averageQuizScorePercent}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openCourseDetail(c.courseId)}
                        className="px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 rounded font-medium hover:bg-indigo-100 transition-colors"
                        type="button"
                      >
                        Drill Down
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Drill Down Modal */}
      {selectedCourseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {courseDetail?.course?.title || 'Course Details'}
                </h3>
                <p className="text-xs text-slate-500">In-depth aggregated metrics for this course</p>
              </div>
              <button
                onClick={() => setSelectedCourseId(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none"
                type="button"
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-slate-400">Loading course metrics…</div>
            ) : detailError ? (
              <div className="p-4 bg-red-50 text-red-700 rounded text-sm">{detailError}</div>
            ) : courseDetail ? (
              <div className="space-y-6">
                {/* Course Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg text-xs">
                  <div>
                    <span className="text-slate-400 block">Status</span>
                    <span className="font-semibold text-slate-800">{courseDetail.course.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Price</span>
                    <span className="font-semibold text-slate-800">
                      {courseDetail.course.price > 0
                        ? `${courseDetail.course.currency} ${courseDetail.course.price}`
                        : 'Free'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Created</span>
                    <span className="font-semibold text-slate-800">
                      {new Date(courseDetail.course.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Course ID</span>
                    <span className="font-mono text-[10px] text-slate-500 block truncate" title={courseDetail.course.id}>
                      {courseDetail.course.id}
                    </span>
                  </div>
                </div>

                {/* Enrollment & Lesson Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="border border-slate-200 rounded-lg p-4">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Enrollments</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Enrolled:</span>
                        <span className="font-bold text-slate-800">{courseDetail.enrollments.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Active Students:</span>
                        <span className="font-bold text-blue-600">{courseDetail.enrollments.active}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Completed Course:</span>
                        <span className="font-bold text-green-600">{courseDetail.enrollments.completed}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="text-slate-500 font-medium">Completion Rate:</span>
                        <span className="font-bold text-indigo-600">{courseDetail.enrollments.completionRatePercent}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-lg p-4">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Curriculum Lessons</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total Lessons:</span>
                        <span className="font-bold text-slate-800">{courseDetail.lessons.totalLessons}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Completed Lesson Records:</span>
                        <span className="font-bold text-blue-600">{courseDetail.lessons.completedProgressRecords}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="text-slate-500 font-medium">Lesson Completion Rate:</span>
                        <span className="font-bold text-indigo-600">{courseDetail.lessons.completionRatePercent}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quizzes & Score Distribution */}
                <div className="border border-slate-200 rounded-lg p-4 space-y-4">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Quiz Performance</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-slate-50 p-2.5 rounded">
                      <p className="text-[11px] text-slate-400">Total Quizzes</p>
                      <p className="text-lg font-bold text-slate-800">{courseDetail.quizzes.totalQuizzes}</p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded">
                      <p className="text-[11px] text-slate-400">Total Attempts</p>
                      <p className="text-lg font-bold text-slate-800">{courseDetail.quizzes.totalAttempts}</p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded">
                      <p className="text-[11px] text-slate-400">Pass Rate</p>
                      <p className="text-lg font-bold text-green-600">{courseDetail.quizzes.passRatePercent}%</p>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded">
                      <p className="text-[11px] text-slate-400">Avg Score</p>
                      <p className="text-lg font-bold text-indigo-600">
                        {courseDetail.quizzes.averageScorePercent !== null
                          ? `${courseDetail.quizzes.averageScorePercent}%`
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {courseDetail.quizzes.scoreDistribution && (
                    <div>
                      <h5 className="text-xs font-semibold text-slate-700 mb-2">Score Distribution Bands</h5>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="bg-red-50 border border-red-100 p-2 rounded text-center">
                          <p className="text-[10px] text-red-600">&lt;50% (Failing)</p>
                          <p className="text-base font-bold text-red-700">
                            {courseDetail.quizzes.scoreDistribution.failing}
                          </p>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 p-2 rounded text-center">
                          <p className="text-[10px] text-amber-600">50–69% (Average)</p>
                          <p className="text-base font-bold text-amber-700">
                            {courseDetail.quizzes.scoreDistribution.average}
                          </p>
                        </div>
                        <div className="bg-blue-50 border border-blue-100 p-2 rounded text-center">
                          <p className="text-[10px] text-blue-600">70–84% (Good)</p>
                          <p className="text-base font-bold text-blue-700">
                            {courseDetail.quizzes.scoreDistribution.good}
                          </p>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 p-2 rounded text-center">
                          <p className="text-[10px] text-emerald-600">85–100% (Excellent)</p>
                          <p className="text-base font-bold text-emerald-700">
                            {courseDetail.quizzes.scoreDistribution.excellent}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={() => setSelectedCourseId(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-700"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
