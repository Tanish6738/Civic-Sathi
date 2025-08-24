'use strict';

import api from '../utils/axios';

export async function fetchAnalytics(params={}){
  const search = new URLSearchParams();
  if (params.rangeDays) search.set('rangeDays', params.rangeDays);
  if (params.granularity) search.set('granularity', params.granularity);
  if (params.compare) search.set('compare', params.compare);
  const qs = search.toString();
  const { data } = await api.get(`/admin/analytics${qs?`?${qs}`:''}`);
  return data.insights;
}

export async function fetchCallActivity(){
  const { data } = await api.get('/admin/call-activity');
  return data.data; // { rangeDays, daily, totals }
}

export async function fetchWebComplaints(){
  const { data } = await api.get('/admin/web-complaints');
  return data.data; // { rangeDays, daily, totals, categoryBreakdown }
}

export default { fetchAnalytics, fetchCallActivity, fetchWebComplaints };
