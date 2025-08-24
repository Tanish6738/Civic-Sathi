import React, { useEffect, useState } from 'react';
import { getDepartments, deleteDepartment, createDepartment } from '../../services/department.services';
import { Link } from 'react-router-dom';
import { Plus, Trash2, RefreshCcw, Building2, Layers3, Users, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
    try {
      const data = await getDepartments();
      setItems(data || []);
    } catch(e){
      setError(e?.response?.data?.message || 'Failed to load departments');
    } finally { setLoading(false); }
  }
  useEffect(()=>{ load(); },[]);

  async function onCreate(e){
    e.preventDefault();
    if(!form.name.trim()) return;
    try {
      await createDepartment({ name: form.name.trim(), description: form.description.trim() });
      setForm({ name:'', description:''});
      setShowCreate(false);
      load();
    } catch(e){
      alert(e?.response?.data?.message || 'Create failed');
    }
  }
  async function onDelete(id){
    if(!window.confirm('Delete department?')) return;
    try {
      await deleteDepartment(id);
      setItems(items.filter(d=>d._id!==id));
    } catch(e){
      alert(e?.response?.data?.message || 'Delete failed');
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-2"><Building2 size={28} className="text-primary"/> Departments</h1>
          <p className="text-sm text-soft/80 max-w-xl">Browse municipal departments, their service categories and officer counts.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <motion.button whileTap={{ scale:.9 }} onClick={load} disabled={loading} className="btn inline-flex items-center gap-1 disabled:opacity-50">
            <RefreshCcw size={16} className={loading? 'animate-spin':''} /> {loading? 'Loading…':'Refresh'}
          </motion.button>
          {isAdmin && (
            <motion.button whileTap={{ scale:.9 }} onClick={()=>setShowCreate(s=>!s)} className="btn-secondary inline-flex items-center gap-1">
              {showCreate? <X size={16}/> : <Plus size={16}/>} {showCreate? 'Close':'New'}
            </motion.button>
          )}
        </div>
      </div>

      {/* Create form */}
      <AnimatePresence initial={false}>
        {showCreate && isAdmin && (
          <motion.form
            key="create"
            onSubmit={onCreate}
            initial={{ opacity:0, y:-6 }}
            animate={{ opacity:1, y:0 }}
            exit={{ opacity:0, y:-6 }}
            className="space-y-4 p-5 rounded-xl bg-surface border border-default shadow-sm"
          >
            <div className="grid sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-medium tracking-wide">Name<span className="text-error">*</span></label>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required placeholder="e.g. Sanitation" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium tracking-wide">Description</label>
                <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Optional short description" />
              </div>
            </div>
            <div className="flex gap-3">
              <motion.button whileTap={{ scale:.9 }} className="btn">Create</motion.button>
              <button type="button" onClick={()=>{setShowCreate(false); setForm({ name:'', description:''});}} className="btn-outline">Cancel</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Errors */}
      <AnimatePresence>{error && (
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }} className="flex items-start gap-2 text-sm text-error bg-error/10 border border-error/30 rounded-md p-3">
          <Info size={14} className="mt-0.5"/> {error}
        </motion.div>
      )}</AnimatePresence>

      {/* Grid */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
        {items.map((d,i) => (
          <motion.div
            key={d._id}
            initial={{ opacity:0, y:12 }}
            animate={{ opacity:1, y:0 }}
            transition={{ delay: i*0.03, duration:.4 }}
            whileHover={{ y:-4 }}
            className="rounded-xl border border-default bg-surface p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <h2 className="text-lg font-semibold leading-tight truncate">{d.name}</h2>
                <p className="text-[11px] text-soft/70 line-clamp-2">{d.description || '—'}</p>
              </div>
              {isAdmin && <button onClick={()=>onDelete(d._id)} className="text-error/80 hover:text-error" title="Delete"><Trash2 size={16}/></button>}
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-soft/80">
              <span className="inline-flex items-center gap-1"><Layers3 size={12} /> {(d.categories?.length)||0} categories</span>
              <span className="inline-flex items-center gap-1"><Users size={12} /> {(d.officers?.length)||0} officers</span>
            </div>
            <div className="mt-auto pt-1 flex justify-end">
              <Link to={`/departments/${d._id}`} className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">View Details →</Link>
            </div>
          </motion.div>
        ))}
        {items.length === 0 && !loading && !error && (
          <div className="col-span-full text-center p-12 rounded-xl border border-dashed border-default text-soft/70 bg-surface">
            <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4"><Building2 size={24}/></div>
            <p className="font-medium">No departments found</p>
            <p className="text-[11px] mt-1">{isAdmin? 'Use the New button to create your first department.' : 'Check back later for available departments.'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentsHome;
