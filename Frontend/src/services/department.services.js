'use strict';

import api from '../utils/axios';

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k,v])=>{ if(v!==undefined && v!==null && v!=='') qs.append(k,v); });
  const str = qs.toString();
  return str ? `?${str}` : '';
}

export async function createDepartment(data){ const { data:res } = await api.post('/departments', data); return res.data; }
export async function getDepartments(params={}){ const { data:res } = await api.get(`/departments${buildQuery(params)}`); return res.data; }
export async function getDepartmentById(id){ const { data:res } = await api.get(`/departments/${id}`); return res.data; }
export async function updateDepartment(id,data){ const { data:res } = await api.put(`/departments/${id}`, data); return res.data; }
export async function deleteDepartment(id){ const { data:res } = await api.delete(`/departments/${id}`); return res.data; }

export default { createDepartment, getDepartments, getDepartmentById, updateDepartment, deleteDepartment };
