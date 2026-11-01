'use client';

import { useEffect, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function auth(): Record<string, string> {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('token')) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path: string) {
  const res = await fetch(`${API}${path}`, { headers: auth() });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ─── Reusable Components ─────────────────────────────────────────────────────

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

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      {sub && <p className="text-sm text-slate-500">{sub}</p>}
    </div>
  );
}

type Period = '7d' | '30d' | '90d' | 'custom';

function PeriodSelector({
  value,
  onChange,
  from,
  to,
  onFromChange,
  onToChange,
  onApplyCustom,
}: {
  value: Period;
  onChange: (p: Period) => void;
  from: string;
  to: string;
  onFromChange: (f: string) => void;
  onToChange: (t: string) => void;
  onApplyCustom: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit text-sm">
        {(['7d', '30d', '90d', 'custom'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            type="button"
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              value === p ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {p === '7d' ? '7 days' : p === '30d' ? '30 days' : p === '90d' ? '90 days' : 'Custom'}
          </button>
        ))}
      </div>

      {value === 'custom' && (
        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-lg text-xs">
          <input
            type="date"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            className="border border-slate-200 rounded px-2 py-1 text-slate-700"
            title="Start date"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            className="border border-slate-200 rounded px-2 py-1 text-slate-700"
            title="End date"
          />
          <button
            onClick={onApplyCustom}
            type="button"
            className="px-2.5 py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}

// Simple CSS bar chart — no external library
function BarChart({
  data,
  color = '#3b82f6',
}: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  if (data.length === 0) {
    return <p className="text-sm text-slate-400 py-6 text-center">No trend data available for this period.</p>;
  }
  return (
    <div className="flex items-end gap-1.5 h-36 overflow-x-auto pt-4 pb-2 px-1">
      {data.map((d) => (
        <div key={d.label} className="flex flex-col items-center gap-1 shrink-0 group" title={`${d.label}: ${d.value}`}>
          <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity font-mono">
            {d.value}
          </span>
          <div
            className="w-4 rounded-t transition-all hover:brightness-110"
            style={{ height: `${Math.max((d.value / max) * 110, 3)}px`, backgroundColor: color }}
          />
          <span className="text-[9px] text-slate-400 rotate-45 origin-left mt-1">{d.label.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

interface AnalyticsRevenueItem {
  currency: string;
  total: number;
}

interface AnalyticsRecentActivity {
  id: string;
  action: string;
  outcome: string;
  actorEmail?: string;
  createdAt: string;
}

interface AnalyticsOverview {
  users: { total: number; students: number; instructors: number; admins: number };
  courses: { total: number; published: number; pendingReview: number; draft: number; rejected: number };
  enrollments: { total: number; active: number; completed: number; overallCompletionRatePercent: number; completionRatePercent?: number };
  revenue: AnalyticsRevenueItem[];
  quizzes: { totalAttempts: number; passedAttempts: number; passRatePercent: number };
  certificates: { total: number };
  recentActivity?: AnalyticsRecentActivity[];
}

interface TrendItem {
  day: string;
  count: number;
}

interface PaymentSummaryItem {
  currency: string;
  totalRevenue: number;
  transactionCount: number;
}

interface PaymentTrendItem {
  day: string;
  total: number;
}

interface PaymentsData {
  summary: PaymentSummaryItem[];
  trend: PaymentTrendItem[];
}

interface AnalyticsCourseItem {
  courseId: string;
  title: string;
  status: string;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  completionRatePercent: number;
}

interface CoursesData {
  data: AnalyticsCourseItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface LearningData {
  enrollments: { completionDistribution: { completed: number; inProgress: number } };
  lessonCompletion: { completionRatePercent: number; completedRecords: number; totalRecords: number };
  quizzes: {
    totalAttempts: number;
    passCount?: number;
    passedAttempts?: number;
    failCount?: number;
    passRatePercent: number;
    averageScorePercent: number;
    hardestQuizzes: { quizId: string; title: string; attempts: number; passRatePercent: number }[];
    scoreDistribution?: {
      failing?: number;
      needsImprovement?: number;
      average?: number;
      acceptable?: number;
      good?: number;
      excellent?: number;
    };
    note?: string;
  };
}

// ─── Main Admin Analytics Page ───────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [enrollTrend, setEnrollTrend] = useState<{ data: TrendItem[] } | null>(null);
  const [userGrowth, setUserGrowth] = useState<{ data: TrendItem[] } | null>(null);
  const [coursesData, setCoursesData] = useState<CoursesData | null>(null);
  const [payments, setPayments] = useState<PaymentsData | null>(null);
  const [learning, setLearning] = useState<LearningData | null>(null);
  const [period, setPeriod] = useState<Period>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Top courses filters & pagination
  const [courseSearch, setCourseSearch] = useState('');
  const [courseStatus, setCourseStatus] = useState('');
  const [coursePage, setCoursePage] = useState(1);
  const [courseLoading, setCourseLoading] = useState(false);

  const buildQuery = useCallback(
    (p: Period) => {
      if (p === 'custom' && customFrom && customTo) {
        return `period=custom&from=${encodeURIComponent(customFrom)}&to=${encodeURIComponent(customTo)}`;
      }
      return `period=${p}`;
    },
    [customFrom, customTo],
  );

  const loadData = useCallback(
    async (p: Period) => {
      setLoading(true);
      setError(null);
      const query = buildQuery(p);

      try {
        const [ov, et, ug, co, py, lrn] = await Promise.all([
          apiFetch('/admin/analytics/overview'),
          apiFetch(`/admin/analytics/enrollments?${query}`),
          apiFetch(`/admin/analytics/users/growth?${query}`),
          apiFetch(`/admin/analytics/courses?page=1&limit=10`),
          apiFetch(`/admin/analytics/payments?${query}`),
          apiFetch('/admin/analytics/learning'),
        ]);
        setOverview(ov as AnalyticsOverview);
        setEnrollTrend(et as { data: TrendItem[] });
        setUserGrowth(ug as { data: TrendItem[] });
        setCoursesData(co as CoursesData);
        setPayments(py as PaymentsData);
        setLearning(lrn as LearningData);
        setCoursePage(1);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    },
    [buildQuery],
  );

  useEffect(() => {
    let ignore = false;
    if (period !== 'custom') {
      const query = `period=${period}`;
      
      Promise.all([
        apiFetch('/admin/analytics/overview'),
        apiFetch(`/admin/analytics/enrollments?${query}`),
        apiFetch(`/admin/analytics/users/growth?${query}`),
        apiFetch(`/admin/analytics/courses?page=1&limit=10`),
        apiFetch(`/admin/analytics/payments?${query}`),
        apiFetch('/admin/analytics/learning'),
      ])
        .then(([ov, et, ug, co, py, lrn]) => {
          if (ignore) return;
          setOverview(ov as AnalyticsOverview);
          setEnrollTrend(et as { data: TrendItem[] });
          setUserGrowth(ug as { data: TrendItem[] });
          setCoursesData(co as CoursesData);
          setPayments(py as PaymentsData);
          setLearning(lrn as LearningData);
          setLoading(false);
        })
        .catch((e: unknown) => {
          if (!ignore) {
            setError(e instanceof Error ? e.message : 'Failed to load analytics');
            setLoading(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [period, customFrom, customTo]);

  const loadCourses = useCallback(async (page: number, search: string, status: string) => {
    setCourseLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '10');
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const res = await apiFetch(`/admin/analytics/courses?${params.toString()}`);
      setCoursesData(res);
      setCoursePage(page);
    } catch {
      // Keep previous
    } finally {
      setCourseLoading(false);
    }
  }, []);

  function handleCourseSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadCourses(1, courseSearch, courseStatus);
  }

  function handleCourseStatusChange(newStatus: string) {
    setCourseStatus(newStatus);
    loadCourses(1, courseSearch, newStatus);
  }

  function exportCsv(type: 'enrollments' | 'payments' | 'courses') {
    fetch(`${API}/admin/analytics/export/${type}`, { headers: auth() })
      .then((r) => {
        if (!r.ok) throw new Error(`Export failed: ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ocms-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((err) => {
        alert(err.message || 'CSV Export failed');
      });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-3">
        <span className="material-symbols-outlined text-[36px] animate-spin">progress_activity</span>
        <span className="font-medium">Loading platform analytics…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-3">
        <span className="material-symbols-outlined text-red-500 text-[24px]">error</span>
        <div>
          <p className="font-semibold text-red-700">Failed to load analytics</p>
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => loadData(period)}
            className="mt-2 text-sm text-red-700 underline font-medium"
            type="button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const enrollChartData = (enrollTrend?.data ?? []).map((d: TrendItem) => ({ label: d.day, value: d.count }));
  const userChartData = (userGrowth?.data ?? []).map((d: TrendItem) => ({ label: d.day, value: d.count }));
  const coursesList = coursesData?.data ?? [];
  const coursesMeta = coursesData?.meta;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-[28px]">analytics</span>
            Platform Analytics & Reports
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time aggregate data calculated directly from persisted database records.
          </p>
        </div>
        <PeriodSelector
          value={period}
          onChange={setPeriod}
          from={customFrom}
          to={customTo}
          onFromChange={setCustomFrom}
          onToChange={setCustomTo}
          onApplyCustom={() => {
            if (!customFrom || !customTo) {
              alert('Please select both start and end dates.');
              return;
            }
            if (customFrom > customTo) {
              alert('Start date cannot be after end date.');
              return;
            }
            loadData('custom');
          }}
        />
      </div>

      {/* Overview Cards */}
      {overview && (
        <div className="space-y-6">
          <section>
            <SectionTitle title="User Base" sub="Total registered accounts and role distribution" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Total Users" value={overview.users.total} color="text-slate-800" />
              <MetricCard label="Students" value={overview.users.students} color="text-blue-600" />
              <MetricCard label="Instructors" value={overview.users.instructors} color="text-indigo-600" />
              <MetricCard label="Admins" value={overview.users.admins} color="text-red-600" />
            </div>
          </section>

          <section>
            <SectionTitle title="Course Catalog" sub="Distribution of courses by publication and review status" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Total Courses" value={overview.courses.total} color="text-slate-800" />
              <MetricCard label="Published" value={overview.courses.published} color="text-green-600" />
              <MetricCard label="Pending Review" value={overview.courses.pendingReview} color="text-amber-600" />
              <MetricCard
                label="Draft / Rejected"
                value={`${overview.courses.draft} / ${overview.courses.rejected}`}
                color="text-slate-500"
              />
            </div>
          </section>

          <section>
            <SectionTitle title="Enrollments & Completions" sub="Active engagement vs. completed courses" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Total Enrollments" value={overview.enrollments.total} color="text-slate-800" />
              <MetricCard label="Active" value={overview.enrollments.active} color="text-blue-600" />
              <MetricCard label="Completed" value={overview.enrollments.completed} color="text-green-600" />
              <MetricCard
                label="Completion Rate"
                value={`${overview.enrollments.completionRatePercent ?? overview.enrollments.overallCompletionRatePercent}%`}
                color="text-indigo-600"
                sub="completed ÷ total enrollments"
              />
            </div>
          </section>

          <section>
            <SectionTitle title="Verified Revenue" sub="SUCCEEDED Stripe payments only — partitioned by currency" />
            {overview.revenue.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm text-slate-500">
                No confirmed payment records found in the database.
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {overview.revenue.map((r: AnalyticsRevenueItem) => (
                  <MetricCard
                    key={r.currency}
                    label={`Revenue (${r.currency})`}
                    value={r.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    color="text-emerald-600"
                    sub="verified Stripe charge total"
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionTitle title="Quizzes & Certification" sub="Assessment attempts and credentials issued" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Quiz Attempts" value={overview.quizzes.totalAttempts} />
              <MetricCard label="Passed" value={overview.quizzes.passedAttempts} color="text-green-600" />
              <MetricCard
                label="Pass Rate"
                value={`${overview.quizzes.passRatePercent}%`}
                color="text-indigo-600"
                sub="passed ÷ submitted"
              />
              <MetricCard label="Certificates Issued" value={overview.certificates.total} color="text-amber-600" />
            </div>
          </section>
        </div>
      )}

      {/* Trends Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Trend */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <SectionTitle title="Enrollment Trend" sub={`Daily new enrollments (${period})`} />
            <button
              id="export-enrollments-csv"
              onClick={() => exportCsv('enrollments')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[14px]">download</span>
              CSV
            </button>
          </div>
          <BarChart data={enrollChartData} color="#3b82f6" />
        </div>

        {/* User Growth */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <SectionTitle title="User Registration Growth" sub={`Daily new accounts (${period})`} />
          <BarChart data={userChartData} color="#6366f1" />
        </div>
      </div>

      {/* Payment Revenue Details */}
      {payments && (
        <section>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <SectionTitle title="Payment Transactions" sub={`Verified payments in ${period}`} />
              <button
                id="export-payments-csv"
                onClick={() => exportCsv('payments')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                CSV
              </button>
            </div>
            {payments.summary.length === 0 ? (
              <p className="text-sm text-slate-400 py-4">No verified payment transactions in this period.</p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {payments.summary.map((s: PaymentSummaryItem) => (
                  <div key={s.currency} className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                    <p className="text-xs font-semibold text-emerald-600 uppercase">{s.currency} Revenue</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">
                      {s.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-emerald-600 mt-0.5">{s.transactionCount} transactions</p>
                  </div>
                ))}
              </div>
            )}
            {payments.trend.length > 0 && (
              <BarChart
                data={payments.trend.map((t: PaymentTrendItem) => ({ label: t.day, value: t.total }))}
                color="#10b981"
              />
            )}
          </div>
        </section>
      )}

      {/* Courses Performance & Pagination */}
      <section>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <SectionTitle title="Course Performance & Enrollment" sub="Individual course completion and enrollment metrics" />
            </div>
            <div className="flex items-center gap-2">
              <button
                id="export-courses-csv"
                onClick={() => exportCsv('courses')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                CSV
              </button>
            </div>
          </div>

          {/* Course Search & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <form onSubmit={handleCourseSearchSubmit} className="flex gap-2 flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search course title…"
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 w-full focus:outline-blue-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700"
              >
                Search
              </button>
            </form>
            <select
              value={courseStatus}
              onChange={(e) => handleCourseStatusChange(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="PUBLISHED">Published</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="DRAFT">Draft</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {courseLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Updating courses…</div>
          ) : coursesList.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No courses match the criteria.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left pb-2.5 font-semibold text-slate-600">Course</th>
                    <th className="text-right pb-2.5 font-semibold text-slate-600">Status</th>
                    <th className="text-right pb-2.5 font-semibold text-slate-600">Total Enrollments</th>
                    <th className="text-right pb-2.5 font-semibold text-slate-600">Active</th>
                    <th className="text-right pb-2.5 font-semibold text-slate-600">Completed</th>
                    <th className="text-right pb-2.5 font-semibold text-slate-600">Completion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {coursesList.map((c: AnalyticsCourseItem) => (
                    <tr key={c.courseId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 font-medium text-slate-800 max-w-[240px] truncate">{c.title}</td>
                      <td className="py-2.5 text-right">
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
                      <td className="py-2.5 text-right text-slate-700">{c.totalEnrollments}</td>
                      <td className="py-2.5 text-right text-blue-600">{c.activeEnrollments}</td>
                      <td className="py-2.5 text-right text-green-600">{c.completedEnrollments}</td>
                      <td className="py-2.5 text-right font-semibold text-indigo-600">{c.completionRatePercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Courses Pagination Controls */}
          {coursesMeta && coursesMeta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 text-xs text-slate-500">
              <span>
                Page {coursesMeta.page} of {coursesMeta.totalPages} ({coursesMeta.total} total courses)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => loadCourses(coursePage - 1, courseSearch, courseStatus)}
                  disabled={coursePage <= 1}
                  className="px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 font-medium"
                  type="button"
                >
                  ← Previous
                </button>
                <button
                  onClick={() => loadCourses(coursePage + 1, courseSearch, courseStatus)}
                  disabled={coursePage >= coursesMeta.totalPages}
                  className="px-3 py-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40 font-medium"
                  type="button"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Learning Analytics & Score Distribution */}
      {learning && (
        <section>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <SectionTitle title="Platform Learning Analytics" sub="Aggregate lesson and quiz performance across all students" />
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <MetricCard
                label="Lesson Completion Rate"
                value={`${learning.lessonCompletion.completionRatePercent}%`}
                sub={`${learning.lessonCompletion.completedRecords} / ${learning.lessonCompletion.totalRecords} lesson records`}
                color="text-blue-600"
              />
              <MetricCard
                label="Quiz Pass Rate"
                value={`${learning.quizzes.passRatePercent}%`}
                sub={`${learning.quizzes.passedAttempts ?? learning.quizzes.passCount ?? 0} passed of ${learning.quizzes.totalAttempts} submitted`}
                color="text-green-600"
              />
              <MetricCard
                label="Avg Quiz Score"
                value={learning.quizzes.averageScorePercent !== null ? `${learning.quizzes.averageScorePercent}%` : 'N/A'}
                sub="Across all submitted attempts"
                color="text-indigo-600"
              />
            </div>

            {/* Quiz Score Distribution */}
            {learning.quizzes.scoreDistribution && (
              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Quiz Score Distribution Bands</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <p className="text-xs text-red-600 font-medium">Failing (&lt;50%)</p>
                    <p className="text-xl font-bold text-red-700 mt-1">{learning.quizzes.scoreDistribution.failing ?? learning.quizzes.scoreDistribution.needsImprovement ?? 0}</p>
                    <p className="text-[10px] text-red-500 mt-0.5">attempts</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <p className="text-xs text-amber-600 font-medium">Average (50–69%)</p>
                    <p className="text-xl font-bold text-amber-700 mt-1">{learning.quizzes.scoreDistribution.average ?? learning.quizzes.scoreDistribution.acceptable ?? 0}</p>
                    <p className="text-[10px] text-amber-500 mt-0.5">attempts</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-xs text-blue-600 font-medium">Good (70–84%)</p>
                    <p className="text-xl font-bold text-blue-700 mt-1">{learning.quizzes.scoreDistribution.good}</p>
                    <p className="text-[10px] text-blue-500 mt-0.5">attempts</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                    <p className="text-xs text-emerald-600 font-medium">Excellent (85–100%)</p>
                    <p className="text-xl font-bold text-emerald-700 mt-1">{learning.quizzes.scoreDistribution.excellent}</p>
                    <p className="text-[10px] text-emerald-500 mt-0.5">attempts</p>
                  </div>
                </div>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-400">{learning.quizzes.note}</p>
          </div>
        </section>
      )}

      {/* Recent Administrative Activity Feed */}
      {overview?.recentActivity && overview.recentActivity.length > 0 && (
        <section>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <SectionTitle title="Recent Administrative Activity" sub="Last 5 actions recorded in the immutable audit log" />
            <div className="divide-y divide-slate-100 text-sm">
              {overview.recentActivity.map((act: AnalyticsRecentActivity) => (
                <div key={act.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        act.outcome === 'SUCCESS' ? 'bg-emerald-500' : 'bg-red-500'
                      }`}
                    />
                    <div>
                      <span className="font-semibold text-slate-800">{act.action}</span>
                      <span className="text-xs text-slate-500 ml-2">by {act.actorEmail || 'System'}</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(act.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
