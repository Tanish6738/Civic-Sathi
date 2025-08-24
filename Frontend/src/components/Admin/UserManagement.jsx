import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useDbUser } from '../../contexts/UserContext';
import { getAllUsers, updateUser } from '../../services/user.services';
import { getDepartments } from '../../services/department.services';
import { Loader2, RefreshCcw, Save } from 'lucide-react';

const ROLES = ['reporter','officer','admin','superadmin'];
const PAGE_SIZES = [10,25,50,100];

export default function UserManagement(){
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [rowErrors, setRowErrors] = useState({});
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [deptError, setDeptError] = useState('');

  // UX state enhancements
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const { dbUser } = useDbUser();

  const load = useCallback(async ()=>{
    setLoading(true); setError('');
    try {
      const data = await getAllUsers({ limit: 200 });
      const arr = data.items || data; setUsers(arr);
    } catch(e){ setError(e?.response?.data?.message || 'Failed to load users'); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{ load(); },[load]);

  // Load departments list
  const loadDepartments = useCallback(async ()=>{
    setDeptLoading(true); setDeptError('');
    try {
      const data = await getDepartments(); // returns array
      setDepartments(data || []);
    } catch(e){ setDeptError(e?.response?.data?.message || 'Failed to load departments'); }
    finally { setDeptLoading(false); }
  },[]);
  useEffect(()=>{ loadDepartments(); },[loadDepartments]);

  async function save(u){
    setSavingId(u._id);
    setRowErrors(prev => ({ ...prev, [u._id]: '' }));
    try {
      const payload = { department: u.department };
      // Include role if actor is admin or superadmin
      if (dbUser?.role === 'superadmin' || dbUser?.role === 'admin') payload.role = u.role;
      console.debug('[UserManagement] Attempt update', u._id, payload);
      const updated = await updateUser(u._id, payload);
      setUsers(prev => prev.map(x => x._id === u._id ? updated : x));
      console.info('[UserManagement] Updated', u._id, '->', { role: updated.role, department: updated.department });
    } catch(e){
      const msg = e?.response?.data?.message || e.message || 'Update failed';
      console.warn('[UserManagement] Update failed', u._id, msg);
      setRowErrors(prev => ({ ...prev, [u._id]: msg }));
    }
    finally { setSavingId(null); }
  }
  // Filtering + sortings
  const filtered = useMemo(()=>{
    return users.filter(u => {
      if (search){
        const s = search.toLowerCase();
        if (!(u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s))) return false;
      }
      if (roleFilter && u.role !== roleFilter) return false;
      if (deptFilter && (u.department || '') !== deptFilter) return false;
      return true;
    });
  },[users, search, roleFilter, deptFilter]);

  const sorted = useMemo(()=>{
    const arr = [...filtered];
    arr.sort((a,b)=>{
      const A = (a[sortKey] || '').toString().toLowerCase();
      const B = (b[sortKey] || '').toString().toLowerCase();
      if (A < B) return sortDir === 'asc' ? -1 : 1;
      if (A > B) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  },[filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = useMemo(()=> sorted.slice((currentPage-1)*pageSize, currentPage*pageSize), [sorted, currentPage, pageSize]);

  // Reset to first page on filter/search/pageSize change
  useEffect(()=>{ setPage(1); }, [search, roleFilter, deptFilter, pageSize]);

  function toggleSort(key){
    if (sortKey === key){ setSortDir(d=> d==='asc'?'desc':'asc'); }
    else { setSortKey(key); setSortDir('asc'); }
  }

  const headerSortIcon = key => sortKey !== key ? '↕' : (sortDir==='asc' ? '↑' : '↓');

  return (
    <div className="space-y-5" aria-labelledby="user-mgmt-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="user-mgmt-heading" className="text-base sm:text-lg font-semibold tracking-tight text-gradient-primary">User Management</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={load} disabled={loading} className="btn btn-secondary flex-1 sm:flex-none h-9 !text-[11px]"><RefreshCcw size={14} className={loading?'animate-spin':''}/> <span className="hidden sm:inline">Refresh</span></button>
        </div>
      </div>
      {error && <p className="text-xs text-rose-600" role="alert">{error}</p>}

      {/* Filters / Search */}
      <div className="flex flex-col sm:flex-row gap-3 bg-surface-trans p-3 rounded-xl border border-default">
        <div className="flex-1 flex gap-3 flex-col sm:flex-row">
          <div className="relative flex-1 min-w-[160px]">
            <input
              placeholder="Search name or email..."
              value={search}
              onChange={e=>setSearch(e.target.value)}
              className="w-full pl-3 pr-9 h-10 rounded-md border-default bg-surface shadow-sm focus:ring-2 focus:ring-primary outline-none"
              aria-label="Search users"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-soft font-medium">{filtered.length}</span>
          </div>
          <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} className="h-10 px-2 rounded-md border-default bg-surface text-xs" aria-label="Filter by role">
            <option value="">All roles</option>
            {ROLES.map(r=> <option key={r}>{r}</option>)}
          </select>
          <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)} className="h-10 px-2 rounded-md border-default bg-surface text-xs min-w-[160px]" aria-label="Filter by department">
            <option value="">All departments</option>
            {departments.map(d=> <option key={d._id} value={d.name}>{d.name}</option>)}
          </select>
          <select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))} className="h-10 px-2 rounded-md border-default bg-surface text-xs w-24" aria-label="Rows per page">
            {PAGE_SIZES.map(s=> <option key={s} value={s}>{s}/pg</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-soft">
          <span>{sorted.length} result{sorted.length!==1 && 's'}</span>
          <span className="hidden sm:inline">| Page {currentPage} / {totalPages}</span>
        </div>
      </div>

      {/* Mobile card layout */}
      <div className="grid gap-3 sm:hidden">
        {paginated.map(u => (
          <div key={u._id} className="group rounded-xl border border-default bg-surface-trans p-4 shadow-sm flex flex-col gap-3 transition-all hover:shadow-md dark:[--tw-ring-color:rgba(var(--ds-primary),0.4)] focus-within:ring-2">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-tight">{u.name}</span>
                <span className="text-[11px] text-soft break-all">{u.email}</span>
              </div>
              <button
                onClick={()=>save(u)}
                disabled={savingId===u._id}
                className="h-8 px-3 rounded-md bg-gradient-success text-white text-[11px] font-medium flex items-center gap-1 disabled:opacity-50 transition-colors"
              >
                <Save size={12} className={savingId===u._id ? 'animate-pulse' : ''}/>{savingId===u._id? 'Saving' : 'Save'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-medium uppercase tracking-wide text-soft">Role</span>
                <select disabled={!(dbUser?.role==='superadmin' || dbUser?.role==='admin')} value={u.role || 'reporter'} onChange={e=>setUsers(prev=> prev.map(x=> x._id===u._id?{...x, role:e.target.value}:x))} className="py-2 px-2 rounded-md border-default bg-surface text-xs focus:ring-2 focus:ring-primary disabled:opacity-50">
                  {ROLES.map(r => <option 
                   className='my-2'
                  key={r}>{r}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 col-span-2">
                <span className="text-[10px] font-medium uppercase tracking-wide text-soft">Department</span>
                <select
                  value={u.department || ''}
                  onChange={e=>setUsers(prev=> prev.map(x=> x._id===u._id?{...x, department:e.target.value}:x))}
                  className="h-9 px-2 rounded-md border-default bg-surface text-xs focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Select Department --</option>
                  {departments.map(d => (
                    <option key={d._id} value={d.name}>{d.name}</option>
                  ))}
                  {u.department && !departments.some(d=>d.name===u.department) && (
                    <option value={u.department}>{u.department}</option>
                  )}
                </select>
                {deptLoading && <span className="inline-flex items-center text-[10px] text-soft"><Loader2 size={12} className="animate-spin mr-1"/>Loading</span>}
                {deptError && <span className="text-[10px] text-rose-500">{deptError}</span>}
              </label>
            </div>
            {rowErrors[u._id] && <p className="text-[10px] text-rose-600">{rowErrors[u._id]}</p>}
          </div>
        ))}
        {loading && <div className="rounded-xl border border-default bg-surface-trans p-4 text-center text-soft text-xs"><Loader2 size={14} className="animate-spin inline mr-1"/> Loading...</div>}
        {!loading && paginated.length===0 && <div className="rounded-xl border border-default bg-surface-trans p-4 text-center text-soft text-xs">No users found.</div>}
      </div>

      {/* Pagination (mobile) */}
      <div className="sm:hidden flex items-center justify-between gap-3 text-[11px] text-soft">
        <button disabled={currentPage===1} onClick={()=>setPage(p=> Math.max(1,p-1))} className="btn btn-outline h-8 disabled:opacity-40">Prev</button>
        <span>Page {currentPage} / {totalPages}</span>
        <button disabled={currentPage===totalPages} onClick={()=>setPage(p=> Math.min(totalPages,p+1))} className="btn btn-outline h-8 disabled:opacity-40">Next</button>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-hidden border border-default rounded-xl bg-surface-trans backdrop-blur">
        <div className="overflow-x-auto">
        <table className="min-w-full text-xs data-table">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-soft">
              <th className="px-3 py-2 cursor-pointer select-none" onClick={()=>toggleSort('name')}>Name <span className="ml-1 text-[9px] opacity-70">{headerSortIcon('name')}</span></th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2 cursor-pointer select-none" onClick={()=>toggleSort('role')}>Role <span className="ml-1 text-[9px] opacity-70">{headerSortIcon('role')}</span></th>
              <th className="px-3 py-2 cursor-pointer select-none" onClick={()=>toggleSort('department')}>Department <span className="ml-1 text-[9px] opacity-70">{headerSortIcon('department')}</span></th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(u => (
              <tr key={u._id} className="border-b last:border-none border-default/50 hover:bg-primary/5 transition-colors">
                <td className="px-3 py-2 max-w-[180px] truncate font-medium">{u.name}</td>
                <td className="px-3 py-2 truncate max-w-[240px] text-soft">{u.email}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <select disabled={!(dbUser?.role==='superadmin' || dbUser?.role==='admin')} value={u.role || 'reporter'} onChange={e=>setUsers(prev=> prev.map(x=> x._id===u._id?{...x, role:e.target.value}:x))} className="h-8 px-2 rounded-md border-default bg-surface text-xs focus:ring-2 focus:ring-primary disabled:opacity-40">
                      {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                    <span className={`badge ${u.role==='superadmin'?'badge-error': u.role==='admin'?'badge-accent': u.role==='officer'?'badge-success':'bg-muted'}`}>{u.role}</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={u.department || ''}
                    onChange={e=>setUsers(prev=> prev.map(x=> x._id===u._id?{...x, department:e.target.value}:x))}
                    className="h-8 px-2 rounded-md border-default bg-surface w-48 text-xs focus:ring-2 focus:ring-primary"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map(d => (
                      <option key={d._id} value={d.name}>{d.name}</option>
                    ))}
                    {u.department && !departments.some(d=>d.name===u.department) && (
                      <option value={u.department}>{u.department}</option>
                    )}
                  </select>
                  {deptLoading && <span className="ml-2 inline-flex items-center text-[10px] text-soft"><Loader2 size={12} className="animate-spin mr-1"/>Loading</span>}
                  {deptError && <span className="ml-2 text-[10px] text-rose-500">{deptError}</span>}
                </td>
                <td className="px-3 py-2">
                  <button disabled={savingId===u._id} onClick={()=>save(u)} className="h-8 px-3 rounded-md bg-gradient-success text-white flex items-center gap-1 text-[11px] font-medium disabled:opacity-50 transition-colors"><Save size={12} className={savingId===u._id ? 'animate-pulse' : ''}/> {savingId===u._id? 'Saving...' : 'Save'}</button>
                  {rowErrors[u._id] && <span className="block mt-1 text-[10px] text-rose-600 max-w-[160px]">{rowErrors[u._id]}</span>}
                </td>
              </tr>
            ))}
            {loading && <tr><td colSpan={5} className="py-6 text-center text-soft"><Loader2 size={16} className="animate-spin inline"/> Loading...</td></tr>}
            {!loading && paginated.length===0 && <tr><td colSpan={5} className="py-6 text-center text-soft">No users found.</td></tr>}
          </tbody>
        </table>
        </div>
        {/* Desktop pagination */}
        <div className="flex items-center justify-between gap-4 p-3 border-t border-default text-[11px] text-soft flex-wrap">
          <div className="flex items-center gap-2">
            <button onClick={()=>setPage(1)} disabled={currentPage===1} className="btn btn-outline h-8 px-3 disabled:opacity-40">«</button>
            <button onClick={()=>setPage(p=> Math.max(1,p-1))} disabled={currentPage===1} className="btn btn-outline h-8 px-3 disabled:opacity-40">Prev</button>
            <span className="px-2">Page {currentPage} / {totalPages}</span>
            <button onClick={()=>setPage(p=> Math.min(totalPages,p+1))} disabled={currentPage===totalPages} className="btn btn-outline h-8 px-3 disabled:opacity-40">Next</button>
            <button onClick={()=>setPage(totalPages)} disabled={currentPage===totalPages} className="btn btn-outline h-8 px-3 disabled:opacity-40">»</button>
          </div>
          <div className="flex items-center gap-3">
            <span>{sorted.length} total</span>
            <span className="hidden md:inline">{filtered.length !== users.length && `(filtered from ${users.length})`}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
