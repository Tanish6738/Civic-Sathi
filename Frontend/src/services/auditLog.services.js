'use strict';

import api from '../utils/axios';

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.append(k, v); });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export async function createAuditLog(data) {
  const { data: res } = await api.post('/audit-logs', data);
  return res.data;
}

export async function getAuditLogs(params = {}) {
  const { data: res } = await api.get(`/audit-logs${buildQuery(params)}`);
  return res.data;
}

export async function getAuditLogById(id) {
  const { data: res } = await api.get(`/audit-logs/${id}`);
  return res.data;
}

export default { createAuditLog, getAuditLogs, getAuditLogById };
