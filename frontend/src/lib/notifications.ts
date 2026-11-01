import { NotificationListResponse } from '@/types';
import { getAuthHeaders, API_BASE } from './api';


export async function fetchNotifications(
  page = 1,
  limit = 20,
  filter: 'all' | 'unread' | 'read' = 'all',
): Promise<NotificationListResponse> {
  const res = await fetch(
    `${API_BASE}/notifications/me?page=${page}&limit=${limit}&filter=${filter}`,
    { headers: getAuthHeaders() },
  );
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await fetch(`${API_BASE}/notifications/me/unread-count`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) return 0;
  const data = await res.json();
  return data.unreadCount ?? 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  await fetch(`${API_BASE}/notifications/${id}/read`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await fetch(`${API_BASE}/notifications/me/read-all`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
}

export async function deleteNotification(id: string): Promise<void> {
  await fetch(`${API_BASE}/notifications/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
}

