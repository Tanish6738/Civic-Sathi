'use strict';

import api from '../utils/axios';

// Create a report (supports FormData or JSON)
export async function createReport(payload) {
  let headers = {};
  if (payload instanceof FormData) headers = { 'Content-Type': 'multipart/form-data' };
  const { data } = await api.post('/reports', payload, { headers });
  return data.data;
}

// Generic list fetch with query params
export async function getReports(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.append(k, v);
  });
  const qs = query.toString();
  const { data } = await api.get(`/reports${qs ? `?${qs}` : ''}`);
  return data.data;
}

export async function getReportById(id) {
  const { data } = await api.get(`/reports/${id}`);
  return data.data;
}

export async function updateReport(id, updates) {
  let headers = {};
  if (updates instanceof FormData) headers = { 'Content-Type': 'multipart/form-data' };
  const { data } = await api.patch(`/reports/${id}`, updates, { headers });
  return data.data;
}

export async function bulkUpdateReports(payload) {
  const { data } = await api.post('/reports/bulk-update', payload);
  return data.data;
}

export async function deleteReport(id) {
  const { data } = await api.delete(`/reports/${id}`);
  return data.data;
}

export async function categorizeReport(description) {
  const { data } = await api.post('/reports/categorize', { description });
  return data.data; // { category, department, officers }
}

export default {
  createReport,
  getReports,
  getReportById,
  updateReport,
  bulkUpdateReports,
  deleteReport,
  categorizeReport,
};
