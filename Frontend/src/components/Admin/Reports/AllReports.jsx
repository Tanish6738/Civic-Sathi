import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import adminEmails from '../../../data/data.json';
import { Search, RefreshCcw, Clock, Download, Eye, ArrowLeftRight, Loader2 } from 'lucide-react';
import ReportDetailDrawer from './ReportDetailDrawer';
import BulkActionsBar from './BulkActionsBar';
import { getReports, updateReport } from '../../../services/report.services';
import { useToast } from '../../../contexts/ToastContext';
import { getAllUsers, updateUser } from '../../../services/user.services';

// Map backend statuses to UI classes
const statusMeta = {
  submitted: { label: 'Submitted', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
  assigned: { label: 'Assigned', cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  in_progress: { label: 'In Progress', cls: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  awaiting_verification: { label: 'Await Verify', cls: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200' },
  verified: { label: 'Verified', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  closed: { label: 'Closed', cls: 'bg-gray-200 text-gray-700 ring-gray-300' },
  deleted: { label: 'Deleted', cls: 'bg-rose-100 text-rose-700 ring-rose-300' },
  draft: { label: 'Draft', cls: 'bg-gray-100 text-gray-600 ring-gray-300' }
};

const PAGE_SIZE = 20;

const AllReports = () => {
  const { isLoaded, user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = !!email && Array.isArray(adminEmails) && adminEmails.includes(email);

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [detail, setDetail] = useState(null);

  async function load() {
    setLoading(true); setError('');
    try {
      const data = await getReports({ page, limit: PAGE_SIZE });
      const arr = Array.isArray(data.items) ? data.items : data; // fallback if backend not paginated yet
      setItems(arr);
      if (data.pagination) setTotalPages(data.pagination.totalPages || 1);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load reports');
    } finally { setLoading(false); }
  }

  async function loadUsers(){
    try {
      const data = await getAllUsers({ limit: 100 });
      const arr = data.items || data;
      setUsers(arr);
    } catch(_){}
  }

  useEffect(()=>{ if(isAdmin && isLoaded){ load(); loadUsers(); } },[isAdmin, isLoaded, page]);

  const filtered = useMemo(()=>{
    return items.filter(r => {
      if (status && r.status !== status) return false;
      if (category && String(r.category?._id || r.category) !== category) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, status, category, query]);

  const categories = useMemo(()=>{
    const set = new Map();
    items.forEach(r => { if(r.category?._id) set.set(r.category._id, r.category.name); });
    return Array.from(set.entries());
  }, [items]);

  const { notify } = useToast();

  async function changeStatus(id, next) {
    setUpdating(id);
    try {
      const updated = await updateReport(id, { status: next });
      setItems(prev => prev.map(r => r._id === id ? updated : r));
      notify('Status updated','success');
    } catch (e) { notify(e?.response?.data?.message || 'Update failed','error'); }
    finally { setUpdating(null); }
  }

  function toggleSelect(id){
    setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  }
  function toggleSelectAll(){
    const ids = filtered.map(r=>r._id);
    const allSelected = ids.every(id => selected.includes(id));
    setSelected(allSelected ? selected.filter(id=> !ids.includes(id)) : Array.from(new Set([...selected, ...ids])));
  }

  if (!isLoaded) return <div className="text-sm text-gray-500">Loading...</div>;
  if (!isAdmin) return <div className="text-sm text-rose-600 font-medium">Access denied.</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">All Reports</h1>
          <p className="text-sm text-gray-600 flex items-center gap-2">System-wide citizen reports {loading && <Loader2 className="animate-spin" size={14}/>} {error && <span className="text-rose-600">· {error}</span>}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 h-11 px-3 rounded-lg border border-gray-300 bg-white/70 backdrop-blur">
            <Search size={16} className="text-gray-500" />
            <input value={query} onChange={e=>{ setQuery(e.target.value); setPage(1); }} placeholder="Search title / description..." className="bg-transparent outline-none text-sm w-48" />
          </div>
          <select value={status} onChange={e=>{ setStatus(e.target.value); setPage(1); }} className="h-11 px-3 rounded-lg border border-gray-300 bg-white/70 text-sm">
            <option value="">All Status</option>
            {Object.entries(statusMeta).map(([k,v])=> <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={category} onChange={e=>{ setCategory(e.target.value); setPage(1); }} className="h-11 px-3 rounded-lg border border-gray-300 bg-white/70 text-sm">
            <option value="">All Categories</option>
            {categories.map(([id,name])=> <option key={id} value={id}>{name}</option>)}
          </select>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-1 h-11 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow disabled:opacity-50 hover:bg-indigo-500 active:scale-95 transition">
            <RefreshCcw size={16} /> Refresh
          </button>
          <button onClick={()=>{
            const blob = new Blob([JSON.stringify(filtered,null,2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='reports-export.json'; a.click(); URL.revokeObjectURL(url);
          }} className="inline-flex items-center gap-1 h-11 px-4 rounded-lg bg-gray-900 text-white text-sm font-medium shadow hover:bg-gray-800 active:scale-95 transition">
            <Download size={16}/> Export
          </button>
        </div>
      </div>

  <BulkActionsBar selectedIds={selected} onDone={(statusApplied)=>{ setItems(prev => prev.map(r => selected.includes(r._id)? { ...r, status: statusApplied } : r)); notify('Bulk status applied','success'); setSelected([]); }} />
  <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white/70 backdrop-blur">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
      <th className="py-3 px-4 font-semibold w-6"><input type="checkbox" aria-label="Select all" checked={filtered.length>0 && filtered.every(r=>selected.includes(r._id))} onChange={toggleSelectAll} /></th>
              <th className="py-3 px-4 font-semibold">Report</th>
              <th className="py-3 px-4 font-semibold">Category</th>
              <th className="py-3 px-4 font-semibold">Reporter</th>
              <th className="py-3 px-4 font-semibold">Created</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const s = statusMeta[r.status] || statusMeta.draft;
              return (
                <tr key={r._id} className="border-b border-gray-100 last:border-none hover:bg-indigo-50/40">
                  <td className="py-3 px-4 align-top"><input type="checkbox" aria-label="Select report" checked={selected.includes(r._id)} onChange={()=>toggleSelect(r._id)} /></td>
                  <td className="py-3 px-4 align-top max-w-xs">
                    <div className="font-medium text-gray-900 truncate" title={r.title}>{r.title}</div>
                    <div className="text-xs text-gray-500 line-clamp-2">{r.description}</div>
                  </td>
                  <td className="py-3 px-4 align-top">
                    {r.category ? <span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 text-[11px] font-medium">{r.category.name}</span> : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="py-3 px-4 align-top">
                    {r.reporter ? <span className="text-xs text-gray-700">{r.reporter.name || r.reporter.email}</span> : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="py-3 px-4 align-top">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-600"><Clock size={12}/> {new Date(r.createdAt).toLocaleString(undefined,{dateStyle:'medium', timeStyle:'short'})}</span>
                  </td>
                  <td className="py-3 px-4 align-top">
                    <span className={`text-[10px] font-semibold tracking-wide px-2 py-1 rounded-md ring-1 ${s.cls}`}>{s.label}</span>
                  </td>
                  <td className="py-3 px-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      {['submitted','assigned','in_progress','awaiting_verification'].includes(r.status) && (
                        <button disabled={updating===r._id} onClick={()=>changeStatus(r._id,'in_progress')} className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 transition"><ArrowLeftRight size={14}/> Prog</button>) }
                      {r.status!=='closed' && (
                        <button disabled={updating===r._id} onClick={()=>changeStatus(r._id,'closed')} className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition">Close</button>) }
                      <button onClick={()=>setDetail(r)} className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition"><Eye size={14}/> View</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-sm text-gray-500">No reports found.</td></tr>
            )}
            {loading && (
              <tr><td colSpan={7} className="py-8 text-center text-sm text-gray-500 flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={16}/> Loading...</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 text-xs">
          <span className="text-gray-500">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 h-8 rounded-md bg-white border text-gray-700 disabled:opacity-40">Prev</button>
            <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 h-8 rounded-md bg-white border text-gray-700 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
  <ReportDetailDrawer report={detail} users={users} onUpdated={(updated)=>{ setItems(prev => prev.map(r => r._id===updated._id? updated : r)); setDetail(updated); }} onClose={()=>setDetail(null)} />
    </div>
  );
};

export default AllReports;