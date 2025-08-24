import React, { useEffect, useState, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Filter, RefreshCcw } from 'lucide-react';
import { getReports } from '../../../services/report.services';
import { getAuditLogs } from '../../../services/auditLog.services';

const statusStyles = {
  submitted: 'bg-amber-100 text-amber-700 ring-amber-300',
  assigned: 'bg-indigo-100 text-indigo-700 ring-indigo-300',
  in_progress: 'bg-blue-100 text-blue-700 ring-blue-300',
  awaiting_verification: 'bg-violet-100 text-violet-700 ring-violet-300',
  verified: 'bg-emerald-100 text-emerald-700 ring-emerald-300',
  closed: 'bg-gray-200 text-gray-700 ring-gray-300',
  deleted: 'bg-rose-100 text-rose-700 ring-rose-300'
};

const MyReports = () => {
  const { isLoaded, user } = useUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchReports = async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const res = await getReports({ reporter: user.publicMetadata?.mongoId || user.id, limit: 100 });
      const items = res.items || [];
      // Fetch latest audit log for each (sequential minimal; could optimize)
      const withLogs = await Promise.all(items.map(async r => {
        try {
          const logsRes = await getAuditLogs({ report: r._id, limit: 1 });
          return { ...r, _latestLog: logsRes.items?.[0] };
        } catch { return r; }
      }));
      setItems(withLogs);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); // eslint-disable-next-line
  }, [user?.id]);

  const filtered = useMemo(() => {
    return (items || []).filter(r => {
      const q = query.toLowerCase();
      const matchQ = !q || r.title?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q) || r?.category?.name?.toLowerCase().includes(q);
      const matchStatus = !statusFilter || r.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [items, query, statusFilter]);

  if (!isLoaded) return <div className="text-sm text-gray-500">Loading...</div>;
  if (!user) return <div className="text-sm text-gray-500">Sign in required.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-3 sm:px-4 animate-fade-in">
      <style>{`.animate-fade-in{animation:fade-in .5s ease both;}@keyframes fade-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">My Reports</h1>
          <p className="text-sm text-gray-600">Track the issues you've reported.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur px-3 h-11 rounded-lg border border-gray-300 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/50">
            <Filter size={16} className="text-gray-500" />
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search" className="bg-transparent outline-none text-sm w-40 sm:w-48" />
          </div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-11 px-3 rounded-lg border border-gray-300 bg-white/80 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50">
            <option value="">All Status</option>
            {Object.keys(statusStyles).filter(s=>s!=='deleted').map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={fetchReports} disabled={loading} className="inline-flex items-center gap-1 h-11 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-500 active:scale-95 transition disabled:opacity-50">
            <RefreshCcw size={16} className={loading? 'animate-spin':''} /> {loading ? 'Loading' : 'Refresh'}
          </button>
        </div>
      </div>
      {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-md p-3">{error}</div>}
      {filtered.length === 0 && !loading && !error && (
        <div className="text-sm text-gray-500 bg-white/80 backdrop-blur border border-dashed border-gray-300 rounded-xl p-10 text-center">No reports yet.</div>
      )}
      {filtered.length > 0 && (
        <div className="overflow-x-auto bg-white/70 backdrop-blur rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600 uppercase text-[11px] tracking-wide bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Last Activity</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r._id} className="border-t border-gray-100 hover:bg-indigo-50/40">
                  <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate">{r.title}</td>
                  <td className="px-4 py-3 text-gray-600">{r.category?.name || '—'}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-semibold px-2 py-1 rounded-md ring-1 ${statusStyles[r.status] || 'bg-gray-100 text-gray-600 ring-gray-300'}`}>{r.status}</span></td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap"><span className="inline-flex items-center gap-1"><Clock size={12} /> {new Date(r.createdAt).toLocaleDateString()}</span></td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-[180px] truncate">{r._latestLog ? `${r._latestLog.action} · ${new Date(r._latestLog.createdAt).toLocaleDateString()}` : '—'}</td>
                  <td className="px-4 py-3 text-right"><Link to={`/user/reports/${r._id}`} className="text-indigo-600 hover:underline">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyReports;