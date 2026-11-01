'use client';

import { useEffect, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function auth(): Record<string, string> {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('token')) : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const ACTION_LABELS: Record<string, string> = {
  USER_LOGIN: '🔑 Login',
  USER_LOGOUT: '🔓 Logout',
  USER_REGISTER: '📝 Register',
  USER_EMAIL_VERIFIED: '✅ Email Verified',
  USER_PASSWORD_RESET: '🔒 Password Reset',
  USER_STATUS_CHANGED: '⚙️ Status Changed',
  USER_DELETED: '🗑️ User Deleted',
  USER_ROLE_CHANGED: '👤 Role Changed',
  COURSE_APPROVED: '🚀 Course Approved',
  COURSE_REJECTED: '⛔ Course Rejected',
  COURSE_SUBMITTED_FOR_REVIEW: '📋 Submitted for Review',
  ENROLLMENT_CREATED: '🎉 Enrollment Created',
  ENROLLMENT_CANCELLED: '❌ Enrollment Cancelled',
  ENROLLMENT_COMPLETED: '🏁 Enrollment Completed',
  PAYMENT_INITIATED: '💳 Payment Initiated',
  PAYMENT_SUCCEEDED: '✅ Payment Succeeded',
  PAYMENT_FAILED: '❌ Payment Failed',
  CERTIFICATE_ISSUED: '🏆 Certificate Issued',
  CERTIFICATE_REVOKED: '⚠️ Certificate Revoked',
  QUIZ_ATTEMPT_SUBMITTED: '📝 Quiz Submitted',
};

function timeStr(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
}

interface AuditLogEntry {
  id: string;
  action: string;
  outcome: string;
  actorEmail?: string | null;
  actorRole?: string | null;
  actorId?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  actorIp?: string | null;
  userAgent?: string | null;
  failureReason?: string | null;
  createdAt: string;
}

interface AuditLogsResponse {
  data: AuditLogEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function AuditLogsPage() {
  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [actorEmail, setActorEmail] = useState('');
  const [action, setAction] = useState('');
  const [outcome, setOutcome] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);

  // Selected entry for metadata inspection modal
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  const load = useCallback(
    async (p = 1) => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('limit', '25');
      if (search) params.set('search', search);
      if (actorEmail) params.set('actorEmail', actorEmail);
      if (action) params.set('action', action);
      if (outcome) params.set('outcome', outcome);
      if (resourceType) params.set('resourceType', resourceType);
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      try {
        const res = await fetch(`${API}/admin/audit-logs?${params}`, { headers: auth() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error loading audit logs');
      } finally {
        setLoading(false);
      }
    },
    [search, actorEmail, action, outcome, resourceType, from, to],
  );

  useEffect(() => {
    let ignore = false;
    const params = new URLSearchParams();
    params.set('page', '1');
    params.set('limit', '25');
    if (search) params.set('search', search);
    if (actorEmail) params.set('actorEmail', actorEmail);
    if (action) params.set('action', action);
    if (outcome) params.set('outcome', outcome);
    if (resourceType) params.set('resourceType', resourceType);
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    fetch(`${API}/admin/audit-logs?${params}`, { headers: auth() })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: AuditLogsResponse) => {
        if (!ignore) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!ignore) {
          setError(e instanceof Error ? e.message : 'Error loading audit logs');
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [search, actorEmail, action, outcome, resourceType, from, to]);

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    load(1);
    setPage(1);
  }

  function handleResetFilters() {
    setSearch('');
    setActorEmail('');
    setAction('');
    setOutcome('');
    setResourceType('');
    setFrom('');
    setTo('');
    setPage(1);
  }

  function exportCsv() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (actorEmail) params.set('actorEmail', actorEmail);
    if (action) params.set('action', action);
    if (outcome) params.set('outcome', outcome);
    if (resourceType) params.set('resourceType', resourceType);
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    fetch(`${API}/admin/audit-logs/export/csv?${params}`, { headers: auth() })
      .then((r) => {
        if (!r.ok) throw new Error(`Export failed: ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ocms-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch((err) => {
        alert(err.message || 'Audit export failed');
      });
  }

  const entries = data?.data ?? [];
  const meta = data?.meta;

  const ACTIONS = Object.keys(ACTION_LABELS);
  const RESOURCE_TYPES = ['USER', 'COURSE', 'ENROLLMENT', 'PAYMENT', 'CERTIFICATE', 'QUIZ_ATTEMPT', 'SYSTEM'];

  return (
    <div className="space-y-6">
      {/* Page Title & CSV Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 text-[28px]">security</span>
            Audit Logs & Security Trail
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Immutable, append-only record of system events. Passwords, secrets, and provider keys are never logged.
          </p>
        </div>
        <button
          id="export-audit-csv"
          onClick={exportCsv}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors shadow-sm self-start sm:self-auto"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">download</span>
          Export Audit CSV
        </button>
      </div>

      {/* Filter Form */}
      <form onSubmit={handleFilterSubmit} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Search email, action, ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-blue-500"
            id="audit-filter-search"
          />

          <input
            type="text"
            placeholder="Actor Email…"
            value={actorEmail}
            onChange={(e) => setActorEmail(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-blue-500"
            id="audit-filter-actor"
          />

          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700"
            id="audit-filter-action"
          >
            <option value="">All Actions</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] ?? a}
              </option>
            ))}
          </select>

          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700"
            id="audit-filter-outcome"
          >
            <option value="">All Outcomes</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILURE">Failure</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700"
            id="audit-filter-resource"
          >
            <option value="">All Resource Types</option>
            {RESOURCE_TYPES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 w-full text-slate-700"
              id="audit-filter-from"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2 py-1.5 w-full text-slate-700"
              id="audit-filter-to"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </form>

      {/* Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
            <span className="material-symbols-outlined animate-spin text-[28px]">progress_activity</span>
            <span className="text-sm font-medium">Loading audit log entries…</span>
          </div>
        ) : error ? (
          <div className="p-6 text-red-600 text-sm">{error}</div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <span className="material-symbols-outlined text-[48px] opacity-30">event_note</span>
            <p className="text-sm">No audit records match the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Timestamp</th>
                  <th className="text-left px-4 py-3 font-semibold">Action</th>
                  <th className="text-left px-4 py-3 font-semibold">Actor</th>
                  <th className="text-left px-4 py-3 font-semibold">Resource</th>
                  <th className="text-left px-4 py-3 font-semibold">Outcome</th>
                  <th className="text-right px-4 py-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((e: AuditLogEntry) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-xs font-mono">
                      {timeStr(e.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
                      {ACTION_LABELS[e.action] ?? e.action}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">
                      <span className="block text-xs font-medium text-slate-800">{e.actorEmail ?? 'System'}</span>
                      {e.actorRole && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded font-mono">
                          {e.actorRole}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {e.resourceType && <span className="block font-semibold text-slate-700">{e.resourceType}</span>}
                      {e.resourceId && (
                        <span className="font-mono text-[10px] text-slate-400 truncate max-w-[140px] block" title={e.resourceId}>
                          {e.resourceId}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          e.outcome === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {e.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedEntry(e)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                        type="button"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-slate-500">
            Page {meta.page} of {meta.totalPages} ({meta.total} total records)
          </p>
          <div className="flex gap-2">
            <button
              id="audit-prev-page"
              onClick={() => {
                const p = page - 1;
                setPage(p);
                load(p);
              }}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              type="button"
            >
              ← Previous
            </button>
            <button
              id="audit-next-page"
              onClick={() => {
                const p = page + 1;
                setPage(p);
                load(p);
              }}
              disabled={page >= meta.totalPages}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              type="button"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Inspect Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base">Audit Log Entry Details</h3>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-700">
              <div className="grid grid-cols-3 py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Event ID</span>
                <span className="col-span-2 font-mono text-[11px] select-all">{selectedEntry.id}</span>
              </div>
              <div className="grid grid-cols-3 py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Action</span>
                <span className="col-span-2 font-semibold text-slate-800">{selectedEntry.action}</span>
              </div>
              <div className="grid grid-cols-3 py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Actor</span>
                <span className="col-span-2">
                  {selectedEntry.actorEmail || 'System'} ({selectedEntry.actorRole || 'SYSTEM'})
                </span>
              </div>
              <div className="grid grid-cols-3 py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Actor IP</span>
                <span className="col-span-2 font-mono">{selectedEntry.actorIp || '—'}</span>
              </div>
              <div className="grid grid-cols-3 py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Outcome</span>
                <span className="col-span-2 font-semibold">{selectedEntry.outcome}</span>
              </div>
              <div className="grid grid-cols-3 py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Resource</span>
                <span className="col-span-2">
                  {selectedEntry.resourceType} {selectedEntry.resourceId ? `(${selectedEntry.resourceId})` : ''}
                </span>
              </div>
              <div className="grid grid-cols-3 py-1 border-b border-slate-100">
                <span className="font-semibold text-slate-500">Timestamp</span>
                <span className="col-span-2">{timeStr(selectedEntry.createdAt)}</span>
              </div>
              {selectedEntry.metadata && (
                <div className="pt-2">
                  <span className="font-semibold text-slate-500 block mb-1">Metadata (Safe):</span>
                  <pre className="bg-slate-50 p-3 rounded-lg border border-slate-200 overflow-x-auto text-[11px] font-mono text-slate-800">
                    {JSON.stringify(selectedEntry.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEntry(null)}
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
