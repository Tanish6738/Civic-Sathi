import api from '../utils/axios';

// Helper to wrap calls and normalize response
async function call(method, url, data, config) {
  try {
    const res = await api({ method, url, data, params: method === 'get' ? data : undefined, ...config });
    return { data: res.data?.data ?? res.data, error: null };
  } catch (e) {
    const err = e.response?.data?.error || e.response?.data?.message || e.message;
    return { data: null, error: err };
  }
}

export function getOfficerReports(params) {
  return call('get', '/officer/reports', params);
}

export function getOfficerDashboard() {
  return call('get', '/officer/dashboard');
}

export function getOfficerHistory(params) {
  return call('get', '/officer/reports/history', params);
}

export function startWork(reportId) {
  return call('post', `/officer/reports/${reportId}/start`);
}

export function uploadAfterPhotos(reportId, photos) {
  return call('patch', `/officer/reports/${reportId}/after-photos`, { photos });
}

export function submitForVerification(reportId) {
  return call('post', `/officer/reports/${reportId}/submit-verification`);
}

export function misrouteReport(reportId, { reason, suggestedCategoryId } = {}) {
  return call('post', `/officer/reports/${reportId}/misroute`, { reason, suggestedCategoryId });
}

export default {
  getOfficerReports,
  getOfficerDashboard,
  getOfficerHistory,
  startWork,
  uploadAfterPhotos,
  submitForVerification,
  misrouteReport
};
