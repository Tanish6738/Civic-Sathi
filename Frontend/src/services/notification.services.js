'use strict';
import api from '../utils/axios';

export async function fetchNotifications({ limit = 20, after } = {}) {
  const params = {};
  if (limit) params.limit = limit;
  if (after) params.after = after;
  const { data } = await api.get('/notifications', { params });
  return data.data; // { items, nextCursor }
}

export async function fetchUnreadCount() {
  const { data } = await api.get('/notifications/unread-count');
  return data.data.count;
}

export async function markNotificationsRead(ids = []) {
  if (!ids.length) return;
  await api.post('/notifications/mark-read', { ids });
}

export async function markAllNotificationsRead(before) {
  await api.post('/notifications/mark-all-read', before ? { before } : {});
}

export function formatNotification(n) {
  const map = {
    'report.misrouted': (n) => `Report misrouted${n?.payload?.reason ? ': ' + n.payload.reason : ''}`,
    'report.awaiting_verification': () => 'Report awaiting verification',
    'report.closed': () => 'Report closed',
    'report.assigned': (n) => `Report assigned to ${n?.payload?.officerName || 'officer'}`,
    'report.verified': () => 'Report verified'
  };
  try { return (map[n.type] || (()=> n.type))(n); } catch { return n.type; }
}
