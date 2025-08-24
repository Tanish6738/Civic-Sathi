import React, { useEffect, useState, useCallback } from 'react';
import { getOfficerReports, startWork } from '../../services/officer.services';
import OfficerReportDetail from './OfficerReportDetail';
import { Search, RotateCcw } from 'lucide-react';

export default function OfficerReportsList() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeReport, setActiveReport] = useState(null);

  const load = useCallback(async (opts={}) => {
    setLoading(true); setError(null);
    const res = await getOfficerReports({ page: opts.page || page, status: statusFilter || undefined, search: q || undefined });
    if (res.error) setError(res.error); else {
      setItems(res.data.items || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
      setPage(res.data.pagination?.page || 1);
    }
    setLoading(false);
  }, [page, statusFilter, q]);

  useEffect(() => { const t = setTimeout(()=> setQ(search), 400); return ()=> clearTimeout(t); }, [search]);
  useEffect(() => { load({ page: 1 }); }, [q, statusFilter]);
  useEffect(() => { load(); }, []);

  async function handleStart(report) {
    const res = await startWork(report._id);
    if (!res.error) {
      // optimistic refresh
      load();
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-4">
      <div className="flex flex-col xs:flex-row gap-3 items-stretch xs:items-end justify-between">
        <div className="flex-1 flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Active Reports</h1>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-soft/60" />
              <input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Search..." className="w-full pl-7 pr-2 h-9 rounded-md bg-surface border border-default text-sm" />
            </div>
            <select value={statusFilter} onChange={e=> setStatusFilter(e.target.value)} className="h-9 px-2 rounded-md bg-surface border border-default text-sm">
              <option value="">All</option>
              <option value="submitted">Submitted</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="awaiting_verification">Awaiting Verification</option>
              <option value="misrouted">Misrouted</option>
            </select>
            <button onClick={()=> load()} className="h-9 px-3 inline-flex items-center gap-1 rounded-md bg-primary text-white text-sm hover:bg-primary/90"><RotateCcw size={14}/>Refresh</button>
          </div>
        </div>
      </div>
      <div className="overflow-x-auto -mx-2 sm:mx-0">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-soft/60">
              <th className="py-2 px-2">Title</th>
              <th className="py-2 px-2">Status</th>
              <th className="py-2 px-2 hidden md:table-cell">Updated</th>
              <th className="py-2 px-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="py-6 text-center text-soft/60">Loading...</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-soft/60">No reports found</td></tr>
            )}
            {!loading && items.map(r => (
              <tr key={r._id} className="border-t border-default/50 hover:bg-surface-50 dark:hover:bg-surface-100/5">
                <td className="py-2 px-2 max-w-[200px] truncate cursor-pointer" onClick={()=> setActiveReport(r._id)}>{r.title}</td>
                <td className="py-2 px-2"><span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-medium">{r.status}</span></td>
                <td className="py-2 px-2 hidden md:table-cell text-soft/70">{new Date(r.updatedAt).toLocaleString()}</td>
                <td className="py-2 px-2 text-right space-x-2">
                  {['submitted','assigned'].includes(r.status) && (
                    <button onClick={()=> handleStart(r)} className="h-8 px-3 rounded-md bg-primary text-white text-xs font-medium hover:bg-primary/90">Start</button>
                  )}
                  <button onClick={()=> setActiveReport(r._id)} className="h-8 px-3 rounded-md bg-surface border border-default text-xs font-medium hover:bg-primary/10">Open</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {activeReport && (
        <OfficerReportDetail reportId={activeReport} onClose={()=> setActiveReport(null)} onChanged={()=> load()} />
      )}
      <div className="flex justify-center gap-2 pt-4">
        <button disabled={page<=1} onClick={()=> load({ page: page-1 })} className="h-8 px-3 rounded-md border border-default bg-surface text-xs disabled:opacity-40">Prev</button>
        <div className="h-8 px-3 inline-flex items-center rounded-md text-xs bg-surface border border-default">Page {page} / {totalPages}</div>
        <button disabled={page>=totalPages} onClick={()=> load({ page: page+1 })} className="h-8 px-3 rounded-md border border-default bg-surface text-xs disabled:opacity-40">Next</button>
      </div>
    </div>
  );
}
