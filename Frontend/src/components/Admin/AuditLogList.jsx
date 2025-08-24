import React, { useEffect, useState, useMemo } from 'react';
import { getAuditLogs } from '../../services/auditLog.services';
import { Clock } from 'lucide-react';

const AuditLogList = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ user: '', action: '' });

  const fetchLogs = async () => {
    setLoading(true); setError('');
    try { const res = await getAuditLogs({ user: filters.user || undefined, action: filters.action || undefined, limit: 200 }); setLogs(res.items || []); }
    catch(e){ setError(e?.response?.data?.message || 'Failed to load logs'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ fetchLogs(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(()=> logs, [logs]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-3 sm:px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">Audit Logs</h1>
          <p className="text-sm text-gray-600">System activity trail.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <input value={filters.user} onChange={e=>setFilters(f=>({...f,user:e.target.value}))} placeholder="User ID" className="h-11 px-3 rounded-lg border border-gray-300 bg-white/80 text-sm shadow-sm" />
          <input value={filters.action} onChange={e=>setFilters(f=>({...f,action:e.target.value}))} placeholder="Action contains" className="h-11 px-3 rounded-lg border border-gray-300 bg-white/80 text-sm shadow-sm" />
          <button onClick={fetchLogs} disabled={loading} className="h-11 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-500 disabled:opacity-50">{loading?'Loading':'Apply'}</button>
        </div>
      </div>
      {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-md p-3">{error}</div>}
      <div className="overflow-x-auto bg-white/70 backdrop-blur rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full text-sm">
          <thead className="text-left text-gray-600 uppercase text-[11px] tracking-wide bg-gray-50">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Report</th>
              <th className="px-4 py-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l._id} className="border-t border-gray-100 hover:bg-indigo-50/40">
                <td className="px-4 py-3 text-gray-800 font-medium max-w-[160px] truncate">{l.user?.name || l.user?._id || '—'}</td>
                <td className="px-4 py-3 text-gray-600 max-w-[260px] truncate" title={l.action}>{l.action}</td>
                <td className="px-4 py-3 text-gray-600">{l.report?.title || '—'}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap"><span className="inline-flex items-center gap-1"><Clock size={12} /> {new Date(l.createdAt).toLocaleString()}</span></td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-gray-500">No logs found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogList;
