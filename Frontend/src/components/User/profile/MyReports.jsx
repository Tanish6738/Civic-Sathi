import React, { useEffect, useState, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Clock, MapPin, ImageOff, Filter, RefreshCcw } from 'lucide-react';

const STORAGE_KEY = 'reports';
const loadReports = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } };

const statusColors = {
  Pending: 'bg-amber-100 text-amber-700 ring-amber-300',
  Resolved: 'bg-emerald-100 text-emerald-700 ring-emerald-300',
  Rejected: 'bg-rose-100 text-rose-700 ring-rose-300'
};

const MyReports = () => {
  const { isLoaded, user } = useUser();
  const [reports, setReports] = useState([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const refresh = () => setReports(loadReports());
  useEffect(()=>{ refresh(); },[]);

  const myReports = useMemo(()=>{
    if(!user) return [];
    return reports.filter(r => r.userId === user.id);
  },[reports,user]);

  const filtered = myReports.filter(r =>
    (!query || r.title.toLowerCase().includes(query.toLowerCase()) || r.category.toLowerCase().includes(query.toLowerCase())) &&
    (!statusFilter || r.status === statusFilter)
  ).sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

  if(!isLoaded) return <div className="text-sm text-gray-500">Loading...</div>;
  if(!user) return <div className="text-sm text-gray-500">Please sign in to view your reports.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">My Reports</h1>
          <p className="text-sm text-gray-600">Track status of issues you have reported.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-white/70 backdrop-blur px-3 h-11 rounded-lg border border-gray-300">
            <Filter size={16} className="text-gray-500" />
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search title/category" className="bg-transparent outline-none text-sm w-48" />
          </div>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-11 px-3 rounded-lg border border-gray-300 bg-white/70 text-sm">
            <option value="">All Status</option>
            <option>Pending</option>
            <option>Resolved</option>
            <option>Rejected</option>
          </select>
          <button onClick={refresh} className="inline-flex items-center gap-1 h-11 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-500 active:scale-95 transition">
            <RefreshCcw size={16} /> Refresh
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-gray-500 bg-white/70 backdrop-blur border border-dashed border-gray-300 rounded-xl p-10 text-center">
          No reports found.
        </div>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(r => (
            <li key={r.id} className="group relative rounded-xl border border-gray-200 bg-white/70 backdrop-blur-sm shadow-sm hover:shadow-md transition overflow-hidden">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-indigo-50/60 to-transparent pointer-events-none transition" />
              {r.image ? (
                <img src={r.image} alt={r.title} className="h-40 w-full object-cover border-b border-gray-200" loading="lazy" />
              ) : (
                <div className="h-40 w-full flex items-center justify-center bg-gray-100 text-gray-400 border-b border-gray-200"><ImageOff size={32} /></div>
              )}
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium text-gray-900 leading-tight line-clamp-2">{r.title}</h3>
                  <span className={`text-[10px] font-semibold tracking-wide px-2 py-1 rounded-md ring-1 ${statusColors[r.status] || 'bg-gray-100 text-gray-600 ring-gray-300'}`}>{r.status}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-wide">
                  <span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">{r.category}</span>
                  {r.location && <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-gray-700 ring-1 ring-gray-300"><MapPin size={12} /> {r.location}</span>}
                </div>
                <p className="text-sm text-gray-600 line-clamp-3 min-h-[60px]">{r.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1"><Clock size={12} /> {new Date(r.createdAt).toLocaleString(undefined,{dateStyle:'medium', timeStyle:'short'})}</span>
                  <button onClick={()=>navigator.clipboard.writeText(r.id)} className="opacity-0 group-hover:opacity-100 text-indigo-600 hover:underline transition">Copy ID</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default MyReports;