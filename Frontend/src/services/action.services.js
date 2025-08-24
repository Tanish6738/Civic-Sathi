'use strict';

import api from '../utils/axios';

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') qs.append(k, v); });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export async function createAction(data) {
  const { data: res } = await api.post('/actions', data);
  return res.data;
}

export async function getActions(params = {}) {
  const { data: res } = await api.get(`/actions${buildQuery(params)}`);
  return res.data;
}

export async function getActionById(id) {
  const { data: res } = await api.get(`/actions/${id}`);
  return res.data;
}

export async function updateAction(id, data) {
  const { data: res } = await api.patch(`/actions/${id}`, data);
  return res.data;
}

export async function deleteAction(id) {
  const { data: res } = await api.delete(`/actions/${id}`);
  return res.data;
}

export default { createAction, getActions, getActionById, updateAction, deleteAction };
