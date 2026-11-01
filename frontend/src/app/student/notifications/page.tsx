'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Notification, NotificationListResponse } from '@/types';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '@/lib/notifications';

const TYPE_ICON: Record<string, string> = {
  ENROLLMENT_CONFIRMED: '🎉',
  ENROLLMENT_PENDING_PAYMENT: '💳',
  PAYMENT_SUCCEEDED: '✅',
  PAYMENT_FAILED: '❌',
  COURSE_APPROVED: '🚀',
  COURSE_REJECTED: '⚠️',
  QUIZ_SUBMITTED: '📝',
  QUIZ_PASSED: '🏅',
  QUIZ_FAILED: '❌',
  CERTIFICATE_ISSUED: '🏆',
  SYSTEM_ANNOUNCEMENT: '📢',
};

const TYPE_LABEL: Record<string, string> = {
  ENROLLMENT_CONFIRMED: 'Enrollment',
  ENROLLMENT_PENDING_PAYMENT: 'Payment Pending',
  PAYMENT_SUCCEEDED: 'Payment',
  PAYMENT_FAILED: 'Payment Failed',
  COURSE_APPROVED: 'Course Approved',
  COURSE_REJECTED: 'Course Rejected',
  QUIZ_SUBMITTED: 'Quiz',
  QUIZ_PASSED: 'Quiz Passed',
  QUIZ_FAILED: 'Quiz Failed',
  CERTIFICATE_ISSUED: 'Certificate',
  SYSTEM_ANNOUNCEMENT: 'Announcement',
};

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(isoDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type FilterType = 'all' | 'unread' | 'read';

export default function NotificationsPage() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');
  const [response, setResponse] = useState<NotificationListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async (p = 1, f: FilterType = filter) => {
    setLoading(true);
    try {
      const res = await fetchNotifications(p, 20, f);
      setResponse(res);
    } catch {
      setResponse(null);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    let ignore = false;
    fetchNotifications(1, 20, filter)
      .then((res) => {
        if (!ignore) {
          setResponse(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          setResponse(null);
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [filter]);

  async function handleMarkRead(n: Notification) {
    if (!n.isRead) {
      setActionLoading(n.id);
      await markNotificationRead(n.id);
      setResponse((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          data: prev.data.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
          meta: { ...prev.meta, unreadCount: Math.max(0, prev.meta.unreadCount - 1) },
        };
      });
      setActionLoading(null);
    }
    if (n.actionUrl) {
      router.push(n.actionUrl);
    }
  }

  async function handleMarkAllRead() {
    setActionLoading('all');
    await markAllNotificationsRead();
    setResponse((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        data: prev.data.map((n) => ({ ...n, isRead: true })),
        meta: { ...prev.meta, unreadCount: 0 },
      };
    });
    setActionLoading(null);
  }

  async function handleDelete(id: string) {
    setActionLoading(id + '-del');
    await deleteNotification(id);
    setResponse((prev) => {
      if (!prev) return prev;
      const deleted = prev.data.find((n) => n.id === id);
      return {
        ...prev,
        data: prev.data.filter((n) => n.id !== id),
        meta: {
          ...prev.meta,
          total: prev.meta.total - 1,
          unreadCount: deleted && !deleted.isRead
            ? Math.max(0, prev.meta.unreadCount - 1)
            : prev.meta.unreadCount,
        },
      };
    });
    setActionLoading(null);
  }

  function changePage(next: number) {
    setPage(next);
    load(next, filter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const notifications = response?.data ?? [];
  const meta = response?.meta;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-[28px]">notifications</span>
            Notifications
            {meta && meta.unreadCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
                {meta.unreadCount} unread
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Stay up to date with your courses, payments, and achievements.
          </p>
        </div>
        {meta && meta.unreadCount > 0 && (
          <button
            id="mark-all-read-btn"
            onClick={handleMarkAllRead}
            disabled={actionLoading === 'all'}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">done_all</span>
            {actionLoading === 'all' ? 'Marking…' : 'Mark all read'}
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-5 w-fit">
        {(['all', 'unread', 'read'] as FilterType[]).map((f) => (
          <button
            key={f}
            id={`notif-filter-${f}`}
            onClick={() => setFilter(f)}
            type="button"
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
              filter === f
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <span className="material-symbols-outlined text-[48px] animate-spin">progress_activity</span>
          <span className="text-sm">Loading notifications…</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
          <span className="material-symbols-outlined text-[64px] opacity-30">notifications_off</span>
          <div className="text-center">
            <p className="font-semibold text-slate-500">No {filter !== 'all' ? filter : ''} notifications</p>
            <p className="text-sm mt-1">
              {filter === 'unread' ? 'All caught up!' : 'Activity will appear here as you use OCMS.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              id={`notification-${n.id}`}
              className={`group relative flex items-start gap-4 p-4 rounded-xl border transition-all duration-150 cursor-pointer ${
                n.isRead
                  ? 'bg-white border-slate-200 hover:border-slate-300'
                  : 'bg-blue-50/60 border-blue-200 hover:border-blue-300'
              }`}
              onClick={() => handleMarkRead(n)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleMarkRead(n)}
            >
              {/* Unread indicator */}
              {!n.isRead && (
                <span className="absolute top-4 left-0 w-1 h-[calc(100%-32px)] rounded-r-full bg-blue-500" />
              )}

              {/* Icon */}
              <div className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-xl ${
                n.isRead ? 'bg-slate-100' : 'bg-white shadow-sm'
              }`}>
                {TYPE_ICON[n.type] ?? '🔔'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-semibold leading-snug ${n.isRead ? 'text-slate-800' : 'text-slate-900'}`}>
                        {n.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-medium">
                        {TYPE_LABEL[n.type] ?? n.type}
                      </span>
                    </div>
                    <p className={`text-sm mt-0.5 ${n.isRead ? 'text-slate-500' : 'text-slate-600'}`}>
                      {n.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                  {!n.isRead && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMarkRead(n); }}
                      disabled={actionLoading === n.id}
                      className="text-xs text-blue-600 hover:underline disabled:opacity-50"
                      type="button"
                    >
                      Mark as read
                    </button>
                  )}
                  {n.actionUrl && (
                    <Link
                      href={n.actionUrl}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                    >
                      View
                      <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}
                disabled={actionLoading === n.id + '-del'}
                aria-label="Delete notification"
                className="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-1">
          <p className="text-sm text-slate-500">
            Page {meta.page} of {meta.totalPages} ({meta.total} total)
          </p>
          <div className="flex gap-2">
            <button
              id="notif-prev-page"
              onClick={() => changePage(page - 1)}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              type="button"
            >
              ← Previous
            </button>
            <button
              id="notif-next-page"
              onClick={() => changePage(page + 1)}
              disabled={page >= meta.totalPages}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              type="button"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
