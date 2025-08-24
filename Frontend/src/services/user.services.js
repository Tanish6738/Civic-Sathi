'use strict';

import api, { setClerkId } from '../utils/axios';

// Transform Clerk user object to backend payload
function clerkToPayload(clerkUser) {
  if (!clerkUser) return null;
  const primaryEmail = clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress || '';
  const primaryPhone = clerkUser.primaryPhoneNumber?.phoneNumber || clerkUser.phoneNumbers?.[0]?.phoneNumber || '';
  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username || 'Unnamed User';
  return {
    clerkId: clerkUser.id,
    email: primaryEmail,
    name,
    phone: primaryPhone || undefined,
  };
}

export async function syncUser(clerkUser) {
  const payload = clerkToPayload(clerkUser);
  if (!payload) throw new Error('Invalid Clerk user');
  const { data } = await api.post('/users/sync', payload);
  if (payload.clerkId) setClerkId(payload.clerkId);
  return data.data; // { success, data, message }
}

export async function getUserById(id) {
  if (id) setClerkId(id); // set header for subsequent requests
  const { data } = await api.get(`/users/${id}`);
  return data.data;
}

export async function updateUser(id, updates) {
  console.debug('[updateUser] PATCH /users/' + id, updates);
  const { data } = await api.patch(`/users/${id}`, updates);
  return data.data;
}

export async function updateUserPhone(userId, phone) {
  const { data } = await api.put(`/users/${userId}/phone`, { phone });
  return data.data;
}

// params: { role, department, status, search, page, limit }
export async function getAllUsers(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k,v]) => {
    if (v !== undefined && v !== null && v !== '') query.append(k, v);
  });
  const qs = query.toString();
  const { data } = await api.get(`/users${qs ? `?${qs}` : ''}`);
  return data.data; // Expect array or paginated payload
}

export default {
  syncUser,
  getUserById,
  updateUser,
  updateUserPhone,
  getAllUsers,
};
