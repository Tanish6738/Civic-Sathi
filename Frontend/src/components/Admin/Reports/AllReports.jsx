import React, { useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import adminEmails from '../../../data/data.json';
import { Search, RefreshCcw, Clock, Download, Eye, ArrowLeftRight, Loader2, X, Sparkles } from 'lucide-react';
import ReportDetailDrawer from './ReportDetailDrawer';
import BulkActionsBar from './BulkActionsBar';
import { getReports, updateReport } from '../../../services/report.services';
import { useToast } from '../../../contexts/ToastContext';
import { getAllUsers } from '../../../services/user.services';

// Status styling via design tokens (purple-forward palette)
const statusMeta = {
  submitted: { label: 'Submitted', cls: 'bg-[rgba(var(--ds-warning),0.15)] text-[rgb(var(--ds-warning))] ring-1 ring-[rgba(var(--ds-warning),0.45)]' },
  assigned: { label: 'Assigned', cls: 'bg-[rgba(var(--ds-primary),0.15)] text-[rgb(var(--ds-primary))] ring-1 ring-[rgba(var(--ds-primary),0.45)]' },
  in_progress: { label: 'In Progress', cls: 'bg-[rgba(var(--ds-accent),0.18)] text-[rgb(var(--ds-accent))] ring-1 ring-[rgba(var(--ds-accent),0.45)]' },
  awaiting_verification: { label: 'Await Verify', cls: 'bg-[rgba(var(--ds-primary),0.2)] text-[rgb(var(--ds-primary))] ring-1 ring-[rgba(var(--ds-primary),0.45)]' },
  verified: { label: 'Verified', cls: 'bg-[rgba(var(--ds-success),0.18)] text-[rgb(var(--ds-success))] ring-1 ring-[rgba(var(--ds-success),0.45)]' },
  closed: { label: 'Closed', cls: 'bg-[rgba(var(--ds-text-soft),0.2)] text-[rgb(var(--ds-text-soft))] ring-1 ring-[rgba(var(--ds-text-soft),0.35)]' },
  deleted: { label: 'Deleted', cls: 'bg-[rgba(var(--ds-error),0.15)] text-[rgb(var(--ds-error))] ring-1 ring-[rgba(var(--ds-error),0.45)]' },
  draft: { label: 'Draft', cls: 'bg-[rgba(var(--ds-muted),0.25)] text-[rgb(var(--ds-text-soft))] ring-1 ring-[rgba(var(--ds-border),0.5)]' }
};

const StatusBadge = ({ status }) => {
  const meta = statusMeta[status] || statusMeta.draft;
  return (
    <span className={`text-[10px] font-semibold tracking-wide px-2 py-1 rounded-md shadow-sm inline-flex items-center gap-1 ${meta.cls}`}>{meta.label}</span>
  );
};

const SkeletonRow = ({ cols = 7 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="py-4 px-4">
        <div className="h-3 w-full max-w-[140px] rounded bg-[rgba(var(--ds-muted),0.5)]" />
      </td>
    ))}
  </tr>
);

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
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [dense, setDense] = useState(false);
  // Mobile-first additions
  const [showFilters, setShowFilters] = useState(false); // collapsible filter/actions on small screens

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

  const statusOrder = ['submitted','assigned','in_progress','awaiting_verification','verified','closed','deleted','draft'];
  const filtered = useMemo(()=>{
    return items.filter(r => {
      if (status && r.status !== status) return false;
      if (category && String(r.category?._id || r.category) !== category) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!r.title?.toLowerCase().includes(q) && !r.description?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, status, category, query]);

  const sorted = useMemo(()=>{
    const data = [...filtered];
    const { key, direction } = sortConfig;
    data.sort((a,b)=>{
      let av, bv;
      switch(key){
        case 'title': av = a.title?.toLowerCase()||''; bv = b.title?.toLowerCase()||''; return av.localeCompare(bv);
        case 'status': av = statusOrder.indexOf(a.status); bv = statusOrder.indexOf(b.status); return av - bv;
        case 'category': av = a.category?.name?.toLowerCase()||''; bv = b.category?.name?.toLowerCase()||''; return av.localeCompare(bv);
        case 'createdAt': av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime(); return av - bv;
        default: return 0;
      }
    });
    if(direction==='desc') data.reverse();
    return data;
  }, [filtered, sortConfig]);

  const requestSort = key => {
    setSortConfig(curr => {
      if(curr.key === key){
        return { key, direction: curr.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: key === 'title' || key === 'category' ? 'asc' : 'desc' };
    });
  };
  const sortIndicator = key => {
    if(sortConfig.key !== key) return <span className="opacity-30">↕</span>;
    return <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

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

  if (!isLoaded) return <div className="text-sm text-soft">Loading...</div>;
  if (!isAdmin) return <div className="text-sm font-medium text-[rgb(var(--ds-error))]">Access denied.</div>;

  return (
    <div className="space-y-10">
      {/* Gradient Header */}
      <section className="relative overflow-hidden rounded-3xl border border-[rgb(var(--ds-border))] bg-gradient-to-br from-[rgb(var(--ds-primary))] via-[rgb(var(--ds-secondary))] to-[rgb(var(--ds-primary))] p-5 md:p-8 text-white shadow-elevate space-y-5 md:space-y-6">
        <div className="absolute inset-0 pointer-events-none opacity-[0.18] bg-[radial-gradient(circle_at_30%_35%,white,transparent_60%)]" />
        <div className="relative flex flex-col lg:flex-row lg:items-end gap-5 md:gap-8">
          <div className="space-y-1.5 flex-1">
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight drop-shadow-sm">All Reports</h1>
            <p className="text-xs md:text-sm text-white/85 flex items-center gap-2">System-wide citizen reports {loading && <Loader2 className="animate-spin" size={14}/>} {error && <span className="text-[rgba(var(--ds-error),1)]">· {error}</span>}</p>
            {/* Mobile summary row */}
            <div className="flex md:hidden flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-white/10 px-2 py-1 rounded-md">{sorted.length} results</span>
              <button onClick={()=>setShowFilters(o=>!o)} className="inline-flex items-center gap-1 text-[10px] font-semibold px-3 py-1 rounded-md bg-white/15 backdrop-blur border border-white/20">{showFilters? 'Hide' : 'Show'} Filters</button>
              <button onClick={load} disabled={loading} className="inline-flex items-center gap-1 text-[10px] font-semibold px-3 py-1 rounded-md bg-white text-[rgb(var(--ds-primary))]">{loading? <Loader2 size={12} className="animate-spin"/>: <RefreshCcw size={12}/>} Refresh</button>
            </div>
          </div>
          {/* Desktop filter / actions row */}
          <div className="hidden md:flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 h-11 rounded-xl border border-white/25 bg-white/15 backdrop-blur px-3 pr-2 shadow-sm focus-within:ring-2 focus-within:ring-white/60 transition">
              <Search size={16} className="text-white/80" />
              <input value={query} onChange={e=>{ setQuery(e.target.value); setPage(1); }} placeholder="Search reports..." className="bg-transparent placeholder:text-white/60 text-white outline-none text-sm w-44 sm:w-56" />
              {!!query && <button onClick={()=>setQuery('')} aria-label="Clear search" className="text-[10px] font-semibold text-white/70 hover:text-white px-2">Clear</button>}
            </div>
            <div className="relative">
              <select value={status} onChange={e=>{ setStatus(e.target.value); setPage(1); }} className="h-11 pl-3 pr-9 rounded-xl border border-white/30 bg-white/15 text-[11px] font-semibold uppercase tracking-wide text-white focus:outline-none focus:ring-2 focus:ring-white/60 backdrop-blur appearance-none">
                <option value="" className="text-gray-800">All Status</option>
                {Object.entries(statusMeta).map(([k,v])=> <option key={k} value={k} className="text-gray-800">{v.label}</option>)}
              </select>
              {status && <button onClick={()=>setStatus('')} className="absolute top-1/2 -translate-y-1/2 right-2 text-white/70 hover:text-white"><X size={14} /></button>}
            </div>
            <div className="relative">
              <select value={category} onChange={e=>{ setCategory(e.target.value); setPage(1); }} className="h-11 pl-3 pr-9 rounded-xl border border-white/30 bg-white/15 text-[11px] font-semibold uppercase tracking-wide text-white focus:outline-none focus:ring-2 focus:ring-white/60 backdrop-blur appearance-none">
                <option value="" className="text-gray-800">All Categories</option>
                {categories.map(([id,name])=> <option key={id} value={id} className="text-gray-800">{name}</option>)}
              </select>
              {category && <button onClick={()=>setCategory('')} className="absolute top-1/2 -translate-y-1/2 right-2 text-white/70 hover:text-white"><X size={14} /></button>}
            </div>
            <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-white/15 text-white text-sm font-semibold shadow-sm hover:bg-white/25 active:scale-95 transition disabled:opacity-50 backdrop-blur">
              <RefreshCcw size={16} className={loading? 'animate-spin':''} /> Refresh
            </button>
            <button onClick={()=>{
              const blob = new Blob([JSON.stringify(sorted,null,2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='reports-export.json'; a.click(); URL.revokeObjectURL(url);
            }} className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-white text-[rgb(var(--ds-primary))] text-sm font-semibold shadow hover:shadow-md active:scale-95 transition">
              <Download size={16}/> Export
            </button>
            <button onClick={()=>{ setDense(d=>!d); }} className="inline-flex items-center gap-1 h-11 px-4 rounded-xl bg-white/15 text-white text-xs font-semibold shadow-sm hover:bg-white/25 active:scale-95 transition">{dense? 'Comfort' : 'Dense'}</button>
          </div>
        </div>
        {/* Desktop summary row */}
        <div className="relative hidden md:flex flex-wrap gap-4 text-xs text-white/80">
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-white/70 animate-pulse" />
            <span>{sorted.length} results</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2 hidden md:inline-flex">
            <Sparkles size={14} /> <span>Click headers to sort</span>
          </div>
        </div>
        {/* Mobile collapsible filters */}
        {showFilters && (
          <div className="md:hidden space-y-3 pt-2 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2 w-full rounded-lg border border-white/25 bg-white/15 backdrop-blur px-3 pr-2 h-10 focus-within:ring-2 focus-within:ring-white/60">
              <Search size={14} className="text-white/80" />
              <input value={query} onChange={e=>{ setQuery(e.target.value); setPage(1); }} placeholder="Search reports..." className="bg-transparent placeholder:text-white/60 text-white outline-none text-xs w-full" />
              {!!query && <button onClick={()=>setQuery('')} aria-label="Clear search" className="text-[9px] font-semibold text-white/70 hover:text-white px-1">Clear</button>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <select value={status} onChange={e=>{ setStatus(e.target.value); setPage(1); }} className="w-full h-10 pl-3 pr-8 rounded-lg border border-white/30 bg-white/15 text-[10px] font-semibold uppercase tracking-wide text-white focus:outline-none focus:ring-2 focus:ring-white/60 backdrop-blur appearance-none">
                  <option value="" className="text-gray-800">All Status</option>
                  {Object.entries(statusMeta).map(([k,v])=> <option key={k} value={k} className="text-gray-800">{v.label}</option>)}
                </select>
                {status && <button onClick={()=>setStatus('')} className="absolute top-1/2 -translate-y-1/2 right-2 text-white/70 hover:text-white"><X size={12} /></button>}
              </div>
              <div className="relative">
                <select value={category} onChange={e=>{ setCategory(e.target.value); setPage(1); }} className="w-full h-10 pl-3 pr-8 rounded-lg border border-white/30 bg-white/15 text-[10px] font-semibold uppercase tracking-wide text-white focus:outline-none focus:ring-2 focus:ring-white/60 backdrop-blur appearance-none">
                  <option value="" className="text-gray-800">All Categories</option>
                  {categories.map(([id,name])=> <option key={id} value={id} className="text-gray-800">{name}</option>)}
                </select>
                {category && <button onClick={()=>setCategory('')} className="absolute top-1/2 -translate-y-1/2 right-2 text-white/70 hover:text-white"><X size={12} /></button>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={()=>{ setDense(d=>!d); }} className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-white/15 text-white text-[10px] font-semibold shadow-sm hover:bg-white/25 active:scale-95 transition">{dense? 'Comfort' : 'Dense'}</button>
              <button onClick={()=>{
                const blob = new Blob([JSON.stringify(sorted,null,2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='reports-export.json'; a.click(); URL.revokeObjectURL(url);
              }} className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-white text-[rgb(var(--ds-primary))] text-[10px] font-semibold shadow active:scale-95 transition"><Download size={12}/> Export</button>
            </div>
          </div>
        )}
      </section>

      {/* Desktop bulk actions */}
      <div className="hidden md:block">
        <BulkActionsBar selectedIds={selected} onDone={(statusApplied)=>{ setItems(prev => prev.map(r => selected.includes(r._id)? { ...r, status: statusApplied } : r)); notify('Bulk status applied','success'); setSelected([]); }} />
      </div>

      {/* Mobile card list (mobile-first) */}
      <div className="md:hidden space-y-3">
        {loading && Array.from({length:5}).map((_,i)=>(
          <div key={i} className="animate-pulse p-4 rounded-xl border border-[rgb(var(--ds-border))] bg-[rgba(var(--ds-surface),0.9)] flex gap-4">
            <div className="h-12 w-12 rounded-md bg-[rgba(var(--ds-muted),0.4)]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 rounded bg-[rgba(var(--ds-muted),0.5)]" />
              <div className="h-3 w-2/3 rounded bg-[rgba(var(--ds-muted),0.4)]" />
              <div className="h-3 w-1/3 rounded bg-[rgba(var(--ds-muted),0.3)]" />
            </div>
          </div>
        ))}
        {!loading && sorted.map(r => (
          <div key={r._id} className={`relative p-4 rounded-xl border border-[rgb(var(--ds-border))] bg-[rgba(var(--ds-surface),0.95)] shadow-sm flex flex-col gap-3 ${selected.includes(r._id)?'ring-2 ring-[rgb(var(--ds-primary))]':''}`}>
            <div className="flex items-start gap-3">
              <input type="checkbox" className="mt-0.5" checked={selected.includes(r._id)} onChange={()=>toggleSelect(r._id)} aria-label="Select report" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[13px] leading-snug text-[rgb(var(--ds-text))] truncate" title={r.title}>{r.title}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-medium text-soft/80">
                  {r.category && <span className="px-1.5 py-0.5 rounded bg-[rgba(var(--ds-primary),0.12)] text-[rgb(var(--ds-primary))] ring-1 ring-[rgba(var(--ds-primary),0.3)]">{r.category.name}</span>}
                  <span className="inline-flex items-center gap-1"><Clock size={10}/>{new Date(r.createdAt).toLocaleDateString(undefined,{month:'short', day:'numeric'})}</span>
                </div>
              </div>
              <StatusBadge status={r.status} />
            </div>
            <div className="flex justify-between items-center gap-3">
              <div className="text-[11px] text-soft/80 truncate flex-1">{r.reporter?.name || r.reporter?.email || '—'}</div>
              <div className="flex gap-1">
                {['submitted','assigned','in_progress','awaiting_verification'].includes(r.status) && (
                  <button disabled={updating===r._id} onClick={()=>changeStatus(r._id,'in_progress')} className="h-7 px-2 rounded-md text-[10px] font-semibold bg-[rgb(var(--ds-primary))] text-white disabled:opacity-50">Prog</button>) }
                {r.status!=='closed' && (
                  <button disabled={updating===r._id} onClick={()=>changeStatus(r._id,'closed')} className="h-7 px-2 rounded-md text-[10px] font-semibold bg-[rgb(var(--ds-success))] text-white disabled:opacity-50">Close</button>) }
                <button onClick={()=>setDetail(r)} className="h-7 px-2 rounded-md text-[10px] font-semibold bg-[rgba(var(--ds-muted),0.4)] text-[rgb(var(--ds-text))]">View</button>
              </div>
            </div>
          </div>
        ))}
        {!loading && sorted.length===0 && (
          <div className="p-10 text-center text-sm text-soft/70 border border-dashed rounded-xl border-[rgb(var(--ds-border))]">No reports found.</div>
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block rounded-2xl border border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))]/90 backdrop-blur shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] thin-scrollbar">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gradient-to-r from-[rgba(var(--ds-muted),0.7)] via-[rgba(var(--ds-muted),0.55)] to-[rgba(var(--ds-muted),0.7)] text-left text-[10px] uppercase tracking-wider font-semibold text-soft backdrop-blur">
              <tr className="border-b border-[rgba(var(--ds-border),0.6)]">
                <th className="py-3 px-4 font-semibold w-6">
                  <input type="checkbox" aria-label="Select all" checked={sorted.length>0 && sorted.every(r=>selected.includes(r._id))} onChange={toggleSelectAll} />
                </th>
                <th className="py-3 px-4 font-semibold select-none">
                  <button onClick={()=>requestSort('title')} className="inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--ds-primary),0.5)] rounded px-1 -mx-1">
                    Report {sortIndicator('title')}
                  </button>
                </th>
                <th className="py-3 px-4 font-semibold select-none">
                  <button onClick={()=>requestSort('category')} className="inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--ds-primary),0.5)] rounded px-1 -mx-1">
                    Category {sortIndicator('category')}
                  </button>
                </th>
                <th className="py-3 px-4 font-semibold">Reporter</th>
                <th className="py-3 px-4 font-semibold select-none whitespace-nowrap">
                  <button onClick={()=>requestSort('createdAt')} className="inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--ds-primary),0.5)] rounded px-1 -mx-1">
                    Created {sortIndicator('createdAt')}
                  </button>
                </th>
                <th className="py-3 px-4 font-semibold select-none">
                  <button onClick={()=>requestSort('status')} className="inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--ds-primary),0.5)] rounded px-1 -mx-1">
                    Status {sortIndicator('status')}
                  </button>
                </th>
                <th className="py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({length:6}).map((_,i)=>(<SkeletonRow key={i} />))}
              {!loading && sorted.map(r => (
                <tr key={r._id} className={`border-b border-[rgba(var(--ds-border),0.4)] last:border-none hover:bg-[rgba(var(--ds-primary),0.06)] transition-colors group ${selected.includes(r._id)?'bg-[rgba(var(--ds-primary),0.08)]': ''}`}>
                  <td className={`px-4 ${dense? 'py-2' : 'py-3'} align-top`}><input type="checkbox" aria-label="Select report" checked={selected.includes(r._id)} onChange={()=>toggleSelect(r._id)} /></td>
                  <td className={`px-4 ${dense? 'py-2' : 'py-3'} align-top max-w-xs`}> 
                    <div className="font-semibold text-[rgb(var(--ds-text))] truncate" title={r.title}>{r.title}</div>
                    {/* <div className="text-[11px] text-soft/80 line-clamp-2">{r.description}</div> */}
                  </td>
                  <td className={`px-4 ${dense? 'py-2' : 'py-3'} align-top`}>
                    {r.category ? <span className="px-2 py-1 rounded-md bg-[rgba(var(--ds-primary),0.12)] text-[rgb(var(--ds-primary))] ring-1 ring-[rgba(var(--ds-primary),0.3)] text-[10px] font-semibold">{r.category.name}</span> : <span className="text-[11px] text-soft/60">—</span>}
                  </td>
                  <td className={`px-4 ${dense? 'py-2' : 'py-3'} align-top`}>{r.reporter ? <span className="text-[11px] text-soft/90">{r.reporter.name || r.reporter.email}</span> : <span className="text-[11px] text-soft/50">—</span>}</td>
                  <td className={`px-4 ${dense? 'py-2' : 'py-3'} align-top whitespace-nowrap`}> <span className="inline-flex items-center gap-1 text-[11px] text-soft/80"><Clock size={12}/> {new Date(r.createdAt).toLocaleString(undefined,{dateStyle:'medium', timeStyle:'short'})}</span></td>
                  <td className={`px-4 ${dense? 'py-2' : 'py-3'} align-top`}><StatusBadge status={r.status} /></td>
                  <td className={`px-4 ${dense? 'py-2' : 'py-3'} align-top`}> 
                    <div className="flex flex-wrap gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      {['submitted','assigned','in_progress','awaiting_verification'].includes(r.status) && (
                        <button disabled={updating===r._id} onClick={()=>changeStatus(r._id,'in_progress')} className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-[10px] font-semibold bg-[rgb(var(--ds-primary))] text-white hover:brightness-110 disabled:opacity-50 transition"><ArrowLeftRight size={14}/> Prog</button>) }
                      {r.status!=='closed' && (
                        <button disabled={updating===r._id} onClick={()=>changeStatus(r._id,'closed')} className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-[10px] font-semibold bg-[rgb(var(--ds-success))] text-white hover:brightness-110 disabled:opacity-50 transition">Close</button>) }
                      <button onClick={()=>setDetail(r)} className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-[10px] font-semibold bg-[rgba(var(--ds-muted),0.5)] text-[rgb(var(--ds-text))] hover:bg-[rgba(var(--ds-muted),0.65)] transition"><Eye size={14}/> View</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && sorted.length === 0 && (
                <tr><td colSpan={7} className="py-14 text-center text-sm text-soft/70">No reports found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[10px] md:text-[11px] font-semibold text-soft mt-4">
          <span className="bg-[rgba(var(--ds-muted),0.4)] px-3 py-2 rounded-lg inline-flex items-center gap-2 w-full md:w-auto justify-center md:justify-start"><Sparkles size={12}/> Page {page} of {totalPages}</span>
          <div className="flex gap-2 justify-center md:justify-end">
            <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-4 h-9 rounded-lg bg-[rgba(var(--ds-primary),0.1)] text-[rgb(var(--ds-primary))] border border-[rgba(var(--ds-primary),0.3)] disabled:opacity-40 hover:bg-[rgba(var(--ds-primary),0.18)] transition">Prev</button>
            <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-4 h-9 rounded-lg bg-[rgba(var(--ds-primary),0.1)] text-[rgb(var(--ds-primary))] border border-[rgba(var(--ds-primary),0.3)] disabled:opacity-40 hover:bg-[rgba(var(--ds-primary),0.18)] transition">Next</button>
          </div>
        </div>
      )}

      {/* Sticky mobile bulk actions bar */}
      {selected.length>0 && (
        <div className="md:hidden fixed bottom-2 left-2 right-2 z-40">
          <div className="rounded-2xl border border-[rgb(var(--ds-border))] bg-[rgba(var(--ds-surface),0.96)] shadow-lg p-3">
            <BulkActionsBar selectedIds={selected} onDone={(statusApplied)=>{ setItems(prev => prev.map(r => selected.includes(r._id)? { ...r, status: statusApplied } : r)); notify('Bulk status applied','success'); setSelected([]); }} />
          </div>
        </div>
      )}
  <ReportDetailDrawer report={detail} users={users} onUpdated={(updated)=>{ setItems(prev => prev.map(r => r._id===updated._id? updated : r)); setDetail(updated); }} onClose={()=>setDetail(null)} />
    </div>
  );
};

export default AllReports;