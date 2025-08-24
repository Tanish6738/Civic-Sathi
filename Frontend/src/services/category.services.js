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

export default { createCategory, getCategories, getCategoryById, updateCategory, deleteCategory };
