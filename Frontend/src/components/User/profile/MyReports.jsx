import React, { useEffect, useState, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { Clock, RefreshCcw, Info, Search, Layers, ArrowRight, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getReports } from '../../../services/report.services';
import { getAuditLogs } from '../../../services/auditLog.services';

// Status styling using theme CSS variables for consistent purple/white palette
const statusStyles = {
  submitted: 'bg-[rgba(var(--ds-warning),0.15)] text-[rgb(var(--ds-warning))] ring-1 ring-[rgba(var(--ds-warning),0.45)]',
  assigned: 'bg-[rgba(var(--ds-primary),0.15)] text-[rgb(var(--ds-primary))] ring-1 ring-[rgba(var(--ds-primary),0.45)]',
  in_progress: 'bg-[rgba(var(--ds-accent),0.15)] text-[rgb(var(--ds-accent))] ring-1 ring-[rgba(var(--ds-accent),0.45)]',
  awaiting_verification: 'bg-[rgba(var(--ds-primary),0.18)] text-[rgb(var(--ds-primary))] ring-1 ring-[rgba(var(--ds-primary),0.4)]',
  verified: 'bg-[rgba(var(--ds-success),0.18)] text-[rgb(var(--ds-success))] ring-1 ring-[rgba(var(--ds-success),0.45)]',
  closed: 'bg-[rgba(var(--ds-text-soft),0.15)] text-[rgb(var(--ds-text-soft))] ring-1 ring-[rgba(var(--ds-text-soft),0.35)]',
  deleted: 'bg-[rgba(var(--ds-error),0.15)] text-[rgb(var(--ds-error))] ring-1 ring-[rgba(var(--ds-error),0.45)]'
};

const StatusBadge = ({ value }) => (
  <span
    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md tracking-wide uppercase shadow-sm ${statusStyles[value] || 'bg-[rgba(var(--ds-muted),0.4)] text-soft ring-1 ring-[rgba(var(--ds-border),0.4)]'}`}
  >
    {value.replace(/_/g,' ')}
  </span>
);

const SkeletonCard = () => (
  <div className="animate-pulse rounded-xl border border-[rgb(var(--ds-border))] bg-[rgba(var(--ds-surface),0.6)] p-4 space-y-3">
    <div className="flex gap-3">
      <div className="h-10 w-10 rounded-lg bg-[rgba(var(--ds-muted),0.7)]" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-2/3 rounded bg-[rgba(var(--ds-muted),0.8)]" />
        <div className="h-2.5 w-1/3 rounded bg-[rgba(var(--ds-muted),0.6)]" />
      </div>
      <div className="h-5 w-16 rounded bg-[rgba(var(--ds-muted),0.6)]" />
    </div>
    <div className="flex gap-4 h-2.5">
      <div className="w-24 rounded bg-[rgba(var(--ds-muted),0.65)]" />
      <div className="w-32 rounded bg-[rgba(var(--ds-muted),0.5)]" />
    </div>
  </div>
);

const MyReports = () => {
  const { isLoaded, user } = useUser();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [dense, setDense] = useState(false);

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

  const statusOrder = ['submitted','assigned','in_progress','awaiting_verification','verified','closed','deleted'];

  const filtered = useMemo(() => {
    return (items || []).filter(r => {
      const q = query.toLowerCase();
      const matchQ = !q || r.title?.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q) || r?.category?.name?.toLowerCase().includes(q);
      const matchStatus = !statusFilter || r.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [items, query, statusFilter]);

  const sorted = useMemo(() => {
    const data = [...filtered];
    const { key, direction } = sortConfig;
    data.sort((a,b) => {
      let av, bv;
      switch(key){
        case 'title':
          av = a.title?.toLowerCase() || ''; bv = b.title?.toLowerCase() || ''; return av.localeCompare(bv);
        case 'category':
          av = a.category?.name?.toLowerCase() || ''; bv = b.category?.name?.toLowerCase() || ''; return av.localeCompare(bv);
        case 'status':
          av = statusOrder.indexOf(a.status); bv = statusOrder.indexOf(b.status); return av - bv;
        case 'lastActivity':
          av = new Date(a._latestLog?.createdAt || a.createdAt).getTime();
          bv = new Date(b._latestLog?.createdAt || b.createdAt).getTime();
          return av - bv;
        case 'createdAt':
        default:
          av = new Date(a.createdAt).getTime();
          bv = new Date(b.createdAt).getTime();
          return av - bv;
      }
    });
    if(direction === 'desc') data.reverse();
    return data;
  }, [filtered, sortConfig]);

  const requestSort = key => {
    setSortConfig(curr => {
      if(curr.key === key){
        const nextDir = curr.direction === 'asc' ? 'desc' : 'asc';
        return { key, direction: nextDir };
      }
      return { key, direction: key === 'title' || key === 'category' ? 'asc' : 'desc' };
    });
  };

  const getSortIndicator = key => {
    if(sortConfig.key !== key) return <span className="opacity-30">↕</span>;
    return <span aria-hidden>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  if (!isLoaded) return <div className="text-sm text-soft">Loading...</div>;
  if (!user) return <div className="text-sm text-soft">Sign in required.</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-3 sm:px-6 py-6">
      {/* Gradient Header */}
      <section className="relative overflow-hidden rounded-3xl border border-[rgb(var(--ds-border))] bg-gradient-to-br from-[rgb(var(--ds-primary))] via-[rgb(var(--ds-secondary))] to-[rgb(var(--ds-primary))] text-white p-8 shadow-elevate">
        <div className="absolute inset-0 opacity-[0.15] bg-[radial-gradient(circle_at_35%_30%,white,transparent_65%)]" />
        <div className="relative flex flex-col md:flex-row md:items-end gap-6">
          <div className="space-y-2 flex-1 min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight drop-shadow-sm">My Reports</h1>
            <p className="text-sm text-white/85">Monitor progress & history of your submitted issues.</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
            <div className="flex items-center gap-2 h-11 rounded-xl border border-white/25 bg-white/15 backdrop-blur px-3 pr-2 shadow-sm focus-within:ring-2 focus-within:ring-white/60 transition">
              <Search size={16} className="text-white/80" />
              <input
                value={query}
                onChange={e=>setQuery(e.target.value)}
                placeholder="Search..."
                className="bg-transparent placeholder:text-white/60 text-white outline-none text-sm w-40 sm:w-56"
              />
              {!!query && (
                <button onClick={()=>setQuery('')} className="text-[10px] text-white/70 hover:text-white transition font-semibold px-2">Clear</button>
              )}
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={e=>setStatusFilter(e.target.value)}
                className="h-11 pl-3 pr-10 rounded-xl border border-white/25 bg-white/15 backdrop-blur text-xs font-semibold uppercase tracking-wide text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-white/60 appearance-none"
              >
                <option value="" className="text-gray-800">All Status</option>
                {Object.keys(statusStyles).filter(s=>s!=='deleted').map(s => <option key={s} value={s} className="text-gray-800">{s.replace(/_/g,' ')}</option>)}
              </select>
              {statusFilter && (
                <button onClick={()=>setStatusFilter('')} className="absolute top-1/2 -translate-y-1/2 right-2 text-white/70 hover:text-white" aria-label="Clear status filter"><X size={14} /></button>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale:1.05 }}
              onClick={fetchReports}
              disabled={loading}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-white/15 text-white text-sm font-semibold shadow-sm hover:bg-white/25 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur"
            >
              <RefreshCcw size={16} className={loading? 'animate-spin':''} /> {loading ? 'Loading' : 'Refresh'}
            </motion.button>
            <Link to="/report/new" className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-white text-[rgb(var(--ds-primary))] text-sm font-semibold shadow hover:shadow-md hover:brightness-105 active:scale-95 transition">
              <Sparkles size={16} /> New Report
            </Link>
          </div>
        </div>
      </section>

      {/* Feedback & empty states */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity:0, y:6 }}
            animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-6 }}
            className="text-sm flex items-start gap-2 bg-[rgba(var(--ds-error),0.12)] text-[rgb(var(--ds-error))] border border-[rgba(var(--ds-error),0.4)] rounded-xl p-4"
          >
            <Info size={14} className="mt-0.5" /> {error}
          </motion.div>
        )}
      </AnimatePresence>
      {!loading && filtered.length === 0 && !error && (
        <motion.div
          initial={{ opacity:0, scale:.96 }}
          animate={{ opacity:1, scale:1 }}
          className="text-sm text-soft bg-[rgb(var(--ds-surface))]/85 backdrop-blur border border-dashed border-[rgb(var(--ds-border))] rounded-2xl p-12 text-center space-y-4 shadow-sm"
        >
          <div className="mx-auto h-14 w-14 rounded-2xl bg-[rgba(var(--ds-primary),0.15)] flex items-center justify-center text-[rgb(var(--ds-primary))] shadow-sm">
            <Layers size={24} />
          </div>
          <p className="font-semibold text-base text-[rgb(var(--ds-text))]">No reports yet</p>
          <p className="text-xs text-soft/80 max-w-sm mx-auto leading-relaxed">Create your first report to start tracking civic issues you care about.</p>
          <Link to="/report/new" className="inline-flex items-center gap-1 text-[rgb(var(--ds-primary))] text-xs font-semibold hover:underline">Create Report <ArrowRight size={14} /></Link>
        </motion.div>
      )}

      {/* Mobile card list */}
      <div className="grid gap-4 md:hidden">
        {loading && Array.from({length:4}).map((_,i)=>(<SkeletonCard key={i}/>))}
        {!loading && filtered.map(r => (
          <motion.div
            key={r._id}
            whileHover={{ y:-3 }}
            transition={{ type:'spring', stiffness:260, damping:22 }}
            className="relative rounded-2xl border border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))]/85 p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0 space-y-1">
                <Link to={`/user/reports/${r._id}`} className="block font-semibold text-sm leading-tight hover:text-[rgb(var(--ds-primary))] transition-colors truncate" title={r.title}>{r.title}</Link>
                <p className="text-[11px] text-soft truncate">{r.category?.name || 'Uncategorized'}</p>
              </div>
              <StatusBadge value={r.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-soft/80">
              <span className="inline-flex items-center gap-1"><Clock size={11}/> {new Date(r.createdAt).toLocaleDateString()}</span>
              <span className="truncate max-w-[160px]">{r._latestLog ? `${r._latestLog.action} · ${new Date(r._latestLog.createdAt).toLocaleDateString()}` : 'No activity'}</span>
            </div>
            <div className="mt-4 flex items-center justify-end">
              <Link to={`/user/reports/${r._id}`} className="text-xs font-semibold text-[rgb(var(--ds-primary))] hover:underline inline-flex items-center gap-1">Open <ArrowRight size={13}/></Link>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Desktop table */}
      {sorted.length > 0 && (
        <div className="hidden md:block rounded-2xl border border-[rgb(var(--ds-border))] bg-[rgb(var(--ds-surface))]/90 backdrop-blur shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(var(--ds-border),0.6)] bg-[rgba(var(--ds-muted),0.35)] text-[11px] uppercase tracking-wide font-semibold text-soft">
            <div className="flex items-center gap-3">
              <span className="text-[rgb(var(--ds-primary))]">{sorted.length}</span> Results
              <span className="h-4 w-px bg-[rgba(var(--ds-border),0.6)]" />
              <button onClick={()=>setDense(d=>!d)} className="px-2 py-1 rounded-md bg-[rgba(var(--ds-primary),0.12)] text-[rgb(var(--ds-primary))] hover:bg-[rgba(var(--ds-primary),0.2)] transition text-[10px] font-semibold">{dense? 'Comfort' : 'Dense'}</button>
            </div>
            <div className="flex gap-2 text-[10px] text-soft/70">
              <span className="hidden xl:inline">Click column headers to sort</span>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[62vh] thin-scrollbar">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 text-left uppercase text-[10px] tracking-wider bg-gradient-to-r from-[rgba(var(--ds-muted),0.65)] via-[rgba(var(--ds-muted),0.55)] to-[rgba(var(--ds-muted),0.65)] text-soft font-semibold backdrop-blur">
                <tr className="border-b border-[rgb(var(--ds-border))]">
                  <th scope="col" className="px-4 py-3 font-semibold select-none">
                    <button onClick={()=>requestSort('title')} className="group inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--ds-primary),0.5)] rounded px-1 -mx-1">
                      Title {getSortIndicator('title')}<span className="opacity-0 group-hover:opacity-60 transition">•</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold select-none">
                    <button onClick={()=>requestSort('category')} className="group inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--ds-primary),0.5)] rounded px-1 -mx-1">
                      Category {getSortIndicator('category')}<span className="opacity-0 group-hover:opacity-60 transition">•</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold select-none">
                    <button onClick={()=>requestSort('status')} className="group inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--ds-primary),0.5)] rounded px-1 -mx-1">
                      Status {getSortIndicator('status')}<span className="opacity-0 group-hover:opacity-60 transition">•</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold select-none whitespace-nowrap">
                    <button onClick={()=>requestSort('createdAt')} className="group inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--ds-primary),0.5)] rounded px-1 -mx-1">
                      Created {getSortIndicator('createdAt')}<span className="opacity-0 group-hover:opacity-60 transition">•</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold select-none whitespace-nowrap">
                    <button onClick={()=>requestSort('lastActivity')} className="group inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--ds-primary),0.5)] rounded px-1 -mx-1">
                      Last Activity {getSortIndicator('lastActivity')}<span className="opacity-0 group-hover:opacity-60 transition">•</span>
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <motion.tr
                    key={r._id}
                    initial={{ opacity:0, y:4 }}
                    animate={{ opacity:1, y:0 }}
                    transition={{ duration:.35 }}
                    className={`border-t border-[rgba(var(--ds-border),0.5)] hover:bg-[rgba(var(--ds-primary),0.07)] transition-colors group ${dense ? 'text-[12px]' : ''}`}
                  >
                    <td className={`px-4 ${dense? 'py-2' : 'py-3'} font-semibold text-[13px] max-w-xs truncate`}> 
                      <Link to={`/user/reports/${r._id}`} className="hover:text-[rgb(var(--ds-primary))] transition-colors" title={r.title}>{r.title}</Link>
                    </td>
                    <td className={`px-4 ${dense? 'py-2' : 'py-3'} text-soft/80 text-[12px]`}>{r.category?.name || '—'}</td>
                    <td className={`px-4 ${dense? 'py-2' : 'py-3'}`}><StatusBadge value={r.status} /></td>
                    <td className={`px-4 ${dense? 'py-2' : 'py-3'} text-soft/80 whitespace-nowrap`}><span className="inline-flex items-center gap-1"><Clock size={12} /> {new Date(r.createdAt).toLocaleDateString()}</span></td>
                    <td className={`px-4 ${dense? 'py-2' : 'py-3'} text-soft/70 text-[11px] max-w-[220px] truncate`}>{r._latestLog ? `${r._latestLog.action} · ${new Date(r._latestLog.createdAt).toLocaleDateString()}` : '—'}</td>
                    <td className={`px-4 ${dense? 'py-2' : 'py-3'} text-right`}> 
                      <Link to={`/user/reports/${r._id}`} className="text-[rgb(var(--ds-primary))] hover:underline text-xs font-semibold opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">View</Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyReports;