'use strict';

import api from '../utils/axios';

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
  return data.data; // { success, data, message }
}

export async function getUserById(id) {
  const { data } = await api.get(`/users/${id}`);
  return data.data;
}

export async function updateUser(id, updates) {
  const { data } = await api.patch(`/users/${id}`, updates);
  return data.data;
}

export default {
  syncUser,
  getUserById,
  updateUser,
};
