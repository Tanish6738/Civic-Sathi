import React, { useEffect, useState } from 'react';
import { getDepartments, deleteDepartment, createDepartment } from '../../services/department.services';
import { Link } from 'react-router-dom';
import { Plus, Trash2, RefreshCcw } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';

const DepartmentsHome = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const { user } = useUser();
  const isAdmin = (user?.publicMetadata?.role || user?.publicMetadata?.mongoRole) === 'admin';

  async function load(){
    setLoading(true); setError('');
    try { const data = await getDepartments(); setItems(data || []); }
    catch(e){ setError(e?.response?.data?.message || 'Failed to load'); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ load(); },[]);

  async function onCreate(e){
    e.preventDefault();
    if(!form.name.trim()) return;
    try { await createDepartment({ name: form.name.trim(), description: form.description.trim() }); setForm({ name:'', description:''}); setShowCreate(false); load(); }
    catch(e){ alert(e?.response?.data?.message || 'Create failed'); }
  }
  async function onDelete(id){
    if(!window.confirm('Delete department?')) return;
    try { await deleteDepartment(id); setItems(items.filter(d=>d._id!==id)); }
    catch(e){ alert(e?.response?.data?.message || 'Delete failed'); }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-3 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Departments</h1>
          <p className="text-sm text-gray-600">Browse municipal departments and their service categories.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-1 h-10 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-500 disabled:opacity-50"><RefreshCcw size={16} className={loading? 'animate-spin':''} /> Refresh</button>
          {isAdmin && <button onClick={()=>setShowCreate(s=>!s)} className="inline-flex items-center gap-1 h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-medium shadow hover:bg-emerald-500"><Plus size={16}/> New</button>}
        </div>
      </div>
      {showCreate && isAdmin && (
        <form onSubmit={onCreate} className="space-y-3 bg-white/80 backdrop-blur rounded-xl border border-gray-200 p-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-600">Name*</label>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500/60 outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600">Description</label>
              <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="mt-1 w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500/60 outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-4 h-10 rounded-lg bg-indigo-600 text-white text-sm font-medium">Create</button>
            <button type="button" onClick={()=>{setShowCreate(false); setForm({ name:'', description:''});}} className="text-xs text-gray-600 hover:underline">Cancel</button>
          </div>
        </form>
      )}
      {error && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">{error}</div>}
      <div className="grid md:grid-cols-2 gap-4">
        {items.map(d => (
          <div key={d._id} className="rounded-xl border border-gray-200 bg-white/80 backdrop-blur p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{d.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{d.description || '—'}</p>
              </div>
              {isAdmin && <button onClick={()=>onDelete(d._id)} className="text-rose-600 hover:text-rose-700" title="Delete"><Trash2 size={16}/></button>}
            </div>
            <div className="text-xs text-gray-600">
              <span className="font-medium">Categories:</span> {d.categories?.map(c=>c.name).join(', ') || '—'}
            </div>
            <div className="text-xs text-gray-600">
              <span className="font-medium">Officers:</span> {d.officers?.length || 0}
            </div>
            <div className="mt-auto pt-1"><Link to={`/departments/${d._id}`} className="text-indigo-600 text-xs font-medium hover:underline">View Details →</Link></div>
          </div>
        ))}
        {items.length === 0 && !loading && !error && <div className="text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg p-10 col-span-full text-center">No departments found.</div>}
      </div>
    </div>
  );
};

export default DepartmentsHome;
