'use strict';

import api from '../utils/axios';

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, v);
  });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export async function createCategory(data) {
  const { data: res } = await api.post('/categories', data);
  return res.data;
}

export async function getCategories(params = {}) {
  const { data: res } = await api.get(`/categories${buildQuery(params)}`);
  return res.data;
}

// Admin usage: returns { items, meta }
export async function adminListCategories(params = {}) {
  const { data: res } = await api.get(`/categories${buildQuery(params)}`);
  return { items: res.data, meta: res.meta || null };
}

export async function getCategoryById(id) {
  const { data: res } = await api.get(`/categories/${id}`);
  return res.data;
}

export async function updateCategory(id, data) {
  const { data: res } = await api.patch(`/categories/${id}`, data);
  return res.data;
}

export async function deleteCategory(id) {
  const { data: res } = await api.delete(`/categories/${id}`);
  return res.data;
}

export async function restoreCategory(id) {
  const { data: res } = await api.post(`/categories/${id}/restore`);
  return res.data;
}

export async function bulkImportCategories(payload) {
  const { data: res } = await api.post('/categories/bulk', payload);
  return res.data;
}

export async function exportCategories(params = {}) {
  // default CSV; if format=json returns JSON body else text
  const qs = new URLSearchParams(params).toString();
  const url = `/categories/export/all${qs ? '?' + qs : ''}`;
  const response = await api.get(url, { responseType: params.format==='json' ? 'json' : 'text' });
  return response.data;
}

export default { createCategory, getCategories, adminListCategories, getCategoryById, updateCategory, deleteCategory, restoreCategory, bulkImportCategories, exportCategories };
