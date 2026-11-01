'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Notification } from '@/types';
import {
  fetchUnreadCount,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '@/lib/notifications';
import { getAuthToken } from '@/lib/api';

const POLL_INTERVAL_MS = 30_000; // poll every 30 s

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

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Only show when logged in
  useEffect(() => {
    const updateTokenState = () => {
      setHasToken(!!getAuthToken());
    };
    updateTokenState();
    window.addEventListener('auth-change', updateTokenState);
    return () => window.removeEventListener('auth-change', updateTokenState);
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchNotifications(1, 25);
      setNotifications(res.data);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll unread count asynchronously without synchronous setState in effect
  useEffect(() => {
    if (!hasToken) return;
    let active = true;

    fetchUnreadCount()
      .then((count) => {
        if (active) setUnread(count);
      })
      .catch(() => {});

    const id = setInterval(() => {
      fetchUnreadCount()
        .then((count) => {
          if (active) setUnread(count);
        })
        .catch(() => {});
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      clearInterval(id);
    };
  }, [hasToken]);

  // Close panel on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      loadNotifications();
    }
  };

  async function handleMarkRead(n: Notification) {
    if (!n.isRead) {
      await markNotificationRead(n.id);
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
      );
      setUnread((c) => Math.max(0, c - 1));
    }
    if (n.actionUrl) {
      setOpen(false);
      router.push(n.actionUrl);
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await deleteNotification(id);
    const deleted = notifications.find((n) => n.id === id);
    if (deleted && !deleted.isRead) setUnread((c) => Math.max(0, c - 1));
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  if (!hasToken) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        id="notification-bell-btn"
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        aria-expanded={open}
        onClick={handleToggle}
        className="relative w-9 h-9 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high transition-all duration-200 group cursor-pointer"
        type="button"
      >
        <span className="material-symbols-outlined text-[20px] text-on-surface-variant group-hover:text-primary transition-colors">
          notifications
        </span>
        {unread > 0 && (
          <span
            id="notification-badge"
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center shadow-sm"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          id="notification-panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-surface-container-lowest shadow-2xl border border-outline-variant/60 z-50 overflow-hidden flex flex-col max-h-[520px] animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-variant/40 bg-surface-container-low">
            <div className="flex items-center gap-2">
              <span className="font-title-sm text-on-surface font-semibold">Notifications</span>
              {unread > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                id="mark-all-read-btn"
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:underline font-medium cursor-pointer"
                type="button"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 divide-y divide-surface-variant/20">
            {loading && (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin text-2xl text-primary">
                  progress_activity
                </span>
                <span className="text-xs">Loading notifications…</span>
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-3xl opacity-40">
                  notifications_off
                </span>
                <p className="text-sm font-medium">No notifications yet</p>
                <p className="text-xs opacity-60">You&apos;re all caught up!</p>
              </div>
            )}

            {!loading &&
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkRead(n)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-surface-container ${
                    !n.isRead ? 'bg-primary/5' : ''
                  }`}
                >
                  {/* Icon */}
                  <span className="text-xl flex-shrink-0 mt-0.5" role="img" aria-hidden="true">
                    {TYPE_ICON[n.type] ?? '🔔'}
                  </span>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p
                        className={`text-xs font-semibold truncate ${
                          !n.isRead ? 'text-primary' : 'text-on-surface'
                        }`}
                      >
                        {n.title}
                      </p>
                      <span className="text-[10px] text-on-surface-variant/70 flex-shrink-0">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant line-clamp-2 mt-0.5">{n.message || n.body}</p>
                  </div>

                  {/* Unread dot / Delete */}
                  <div className="flex items-center gap-1 flex-shrink-0 self-center">
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary" aria-label="Unread" />
                    )}
                    <button
                      type="button"
                      aria-label="Delete notification"
                      onClick={(e) => handleDelete(e, n.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-error/10 hover:text-error text-on-surface-variant/50 transition-opacity"
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-surface-variant/40 bg-surface-container-low text-center">
            <Link
              href="/student/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-primary hover:underline font-semibold"
            >
              View all notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
