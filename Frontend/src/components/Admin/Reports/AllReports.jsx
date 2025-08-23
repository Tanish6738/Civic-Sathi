import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import adminEmails from '../../../data/data.json';
import { Search, Filter, RefreshCcw, MapPin, Clock, ImageOff, Download, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'reports';
const loadReports = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } };
const saveReports = (all) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch {} };

const statusClasses = {
  Pending: 'bg-amber-100 text-amber-700 ring-amber-300',
  Resolved: 'bg-emerald-100 text-emerald-700 ring-emerald-300',
  Rejected: 'bg-rose-100 text-rose-700 ring-rose-300'
};

const AllReports = () => {
  const { isLoaded, user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = !!email && Array.isArray(adminEmails) && adminEmails.includes(email);

  const [reports, setReports] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [busyId, setBusyId] = useState(null);

  const refresh = () => setReports(loadReports());
  useEffect(()=>{ refresh(); },[]);

  const categories = useMemo(()=> Array.from(new Set(reports.map(r=>r.category).filter(Boolean))), [reports]);

  const filtered = useMemo(()=>{
    return reports
      .filter(r => !query || r.title.toLowerCase().includes(query.toLowerCase()) || r.description.toLowerCase().includes(query.toLowerCase()) || (r.location||'').toLowerCase().includes(query.toLowerCase()))
      .filter(r => !statusFilter || r.status === statusFilter)
      .filter(r => !categoryFilter || r.category === categoryFilter)
      .sort((a,b)=>{
        if(sort==='newest') return new Date(b.createdAt)-new Date(a.createdAt);
        if(sort==='oldest') return new Date(a.createdAt)-new Date(b.createdAt);
        if(sort==='status') return a.status.localeCompare(b.status);
        return 0;
      });
  },[reports,query,statusFilter,categoryFilter,sort]);

  const updateStatus = (id, status) => {
    setBusyId(id);
    setReports(prev => {
      const next = prev.map(r => r.id === id ? { ...r, status } : r);
      saveReports(next);
      return next;
    });
    setTimeout(()=> setBusyId(null), 400); // small UX delay to show spinner if desired
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'reports-export.json'; a.click();
    URL.revokeObjectURL(url);
  };

  if(!isLoaded) return <div className="text-sm text-gray-500">Loading...</div>;
  if(!isAdmin) return <div className="text-sm text-rose-600 font-medium">Access denied.</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">All Reports</h1>
          <p className="text-sm text-gray-600">Manage and triage every reported issue.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 h-11 px-3 rounded-lg border border-gray-300 bg-white/70 backdrop-blur">
            <Search size={16} className="text-gray-500" />
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search..." className="bg-transparent outline-none text-sm w-44" />
          </div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-11 px-3 rounded-lg border border-gray-300 bg-white/70 text-sm">
            <option value="">All Status</option>
            <option>Pending</option>
            <option>Resolved</option>
            <option>Rejected</option>
          </select>
          <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} className="h-11 px-3 rounded-lg border border-gray-300 bg-white/70 text-sm">
            <option value="">All Categories</option>
            {categories.map(c=> <option key={c}>{c}</option>)}
          </select>
          <select value={sort} onChange={e=>setSort(e.target.value)} className="h-11 px-3 rounded-lg border border-gray-300 bg-white/70 text-sm">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="status">Status</option>
          </select>
          <button onClick={refresh} className="inline-flex items-center gap-1 h-11 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-500 active:scale-95 transition">
            <RefreshCcw size={16} /> Refresh
          </button>
          <button onClick={exportJSON} className="inline-flex items-center gap-1 h-11 px-4 rounded-lg bg-gray-900 text-white text-sm font-medium shadow hover:bg-gray-800 active:scale-95 transition">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-gray-500 bg-white/70 backdrop-blur border border-dashed border-gray-300 rounded-xl p-10 text-center">
          No reports match filters.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white/70 backdrop-blur">
          <table className="min-w-full text-sm">            
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-200">
                <th className="py-3 px-4 font-semibold">Title</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Location</th>
                <th className="py-3 px-4 font-semibold">Submitted</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-100 last:border-none hover:bg-indigo-50/40">
                  <td className="py-3 px-4 align-top max-w-xs">
                    <div className="font-medium text-gray-900 truncate" title={r.title}>{r.title}</div>
                    <div className="text-xs text-gray-500 line-clamp-2">{r.description}</div>
                    <div className="flex gap-2 mt-1">
                      {r.image ? (
                        <button onClick={()=>window.open(r.image,'_blank')} className="text-[10px] text-indigo-600 hover:underline">View Image</button>
                      ): <span className="text-[10px] text-gray-400 inline-flex items-center gap-1"><ImageOff size={10}/> No Image</span>}
                      <button onClick={()=>navigator.clipboard.writeText(r.id)} className="text-[10px] text-gray-500 hover:text-gray-700">Copy ID</button>
                    </div>
                  </td>
                  <td className="py-3 px-4 align-top">
                    <span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 text-[11px] font-medium">{r.category}</span>
                  </td>
                  <td className="py-3 px-4 align-top">
                    {r.location ? (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-600"><MapPin size={12}/>{r.location}</span>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="py-3 px-4 align-top">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-600"><Clock size={12}/> {new Date(r.createdAt).toLocaleString(undefined,{dateStyle:'medium', timeStyle:'short'})}</span>
                  </td>
                  <td className="py-3 px-4 align-top">
                    <span className={`text-[10px] font-semibold tracking-wide px-2 py-1 rounded-md ring-1 ${statusClasses[r.status] || 'bg-gray-100 text-gray-600 ring-gray-300'}`}>{r.status}</span>
                  </td>
                  <td className="py-3 px-4 align-top">
                    <div className="flex flex-wrap gap-2">
                      <button disabled={r.status==='Resolved'|| busyId===r.id} onClick={()=>updateStatus(r.id,'Resolved')} className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition">
                        <CheckCircle2 size={14}/> Resolve
                      </button>
                      <button disabled={r.status==='Rejected'|| busyId===r.id} onClick={()=>updateStatus(r.id,'Rejected')} className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium bg-rose-600 text-white hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition">
                        <XCircle size={14}/> Reject
                      </button>
                      {r.status!=='Pending' && (
                        <button disabled={busyId===r.id} onClick={()=>updateStatus(r.id,'Pending')} className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium bg-amber-500 text-white hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition">
                          <AlertTriangle size={14}/> Reopen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AllReports;