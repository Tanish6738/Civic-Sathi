import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getDepartmentById, updateDepartment } from '../../services/department.services';
import { useUser } from '@clerk/clerk-react';
import { ArrowLeft, Save, Pencil, X, Building2, Users2, Layers, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DepartmentDetail = () => {
  const { id } = useParams();
  const [dept, setDept] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useUser();
  const isAdmin = (user?.publicMetadata?.role || user?.publicMetadata?.mongoRole) === 'admin';

  async function load(){
    setLoading(true); setError('');
    try { const data = await getDepartmentById(id); setDept(data); setForm({ name: data.name, description: data.description || '' }); }
    catch(e){ setError(e?.response?.data?.message || 'Failed to load'); }
    finally { setLoading(false); }
  }

  useEffect(()=>{ if(id) load(); },[id]);

  async function save(e){
    e.preventDefault();
    try { const updated = await updateDepartment(id, { name: form.name, description: form.description }); setDept(updated); setEditing(false); }
    catch(e){ alert(e?.response?.data?.message || 'Update failed'); }
  }

  if (loading) return <div className="text-sm text-soft px-4">Loading...</div>;
  if (error) return <div className="text-sm text-error px-4">{error}</div>;
  if (!dept) return <div className="text-sm text-soft px-4">Not found.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 px-3 sm:px-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/departments" className="inline-flex items-center gap-1 text-primary hover:underline font-medium"><ArrowLeft size={14}/> Back</Link>
          <span className="text-soft/50">/</span>
          <span className="text-soft truncate max-w-[200px] sm:max-w-none">{dept.name}</span>
        </div>
        <div className="flex-1" />
        {isAdmin && !editing && (
          <motion.button
            whileTap={{ scale: .92 }}
            whileHover={{ y:-2 }}
            onClick={()=>setEditing(true)}
            className="inline-flex items-center gap-1 px-4 h-10 rounded-lg bg-primary text-white text-xs font-medium shadow-sm hover:shadow-md transition"
          >
            <Pencil size={14}/> Edit
          </motion.button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3 auto-rows-min">
        <motion.div
          layout
          className="lg:col-span-2 rounded-xl border border-default bg-surface shadow-sm p-6 flex flex-col gap-6"
        >
          <AnimatePresence mode="wait">
            {editing ? (
              <motion.form
                key="edit-form"
                initial={{ opacity:0, y:8 }}
                animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-8 }}
                onSubmit={save}
                className="space-y-5"
              >
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="flex flex-col">
                    <label className="text-[11px] font-semibold tracking-wide text-soft/80 uppercase">Name*</label>
                    <input
                      value={form.name}
                      onChange={e=>setForm(f=>({...f,name:e.target.value}))}
                      required
                      className="mt-1 h-11 px-3 rounded-md border border-default bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[11px] font-semibold tracking-wide text-soft/80 uppercase">Description</label>
                    <input
                      value={form.description}
                      onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                      className="mt-1 h-11 px-3 rounded-md border border-default bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <motion.button
                    whileTap={{ scale:.94 }}
                    className="inline-flex items-center gap-1 px-5 h-11 rounded-lg bg-success text-white text-sm font-medium shadow-sm hover:shadow-md transition"
                  >
                    <Save size={15}/> Save
                  </motion.button>
                  <button
                    type="button"
                    onClick={()=>{ setEditing(false); setForm({ name: dept.name, description: dept.description||'' }); }}
                    className="text-xs font-medium text-soft hover:text-primary transition"
                  >Cancel</button>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="view-mode"
                initial={{ opacity:0, y:8 }}
                animate={{ opacity:1, y:0 }}
                exit={{ opacity:0, y:-8 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2"><Building2 size={20} className="text-primary"/> {dept.name}</h1>
                  <p className="text-sm text-soft/80 leading-relaxed">{dept.description || 'No description provided.'}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold tracking-wide text-soft/70 uppercase flex items-center gap-1"><Layers size={14}/> Categories</h3>
                  <div className="flex flex-wrap gap-2">
                    {dept.categories?.length ? dept.categories.map(c => (
                      <span key={c._id} className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-[11px] font-medium ring-1 ring-primary/30">{c.name}</span>
                    )) : <span className="text-xs text-soft/60">None</span>}
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold tracking-wide text-soft/70 uppercase flex items-center gap-1"><Users2 size={14}/> Officers</h3>
                  <div className="flex flex-col gap-2">
                    {dept.officers?.length ? dept.officers.map(o => (
                      <div key={o._id} className="text-xs rounded-md border border-default px-3 py-2 bg-surface flex items-center justify-between hover:bg-primary/5 transition-colors">
                        <span className="font-medium text-[11px] tracking-wide">{o.name}</span>
                        <span className="text-soft/70">{o.role}</span>
                      </div>
                    )) : <span className="text-xs text-soft/60">None</span>}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Side panel */}
        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-default bg-surface p-5 shadow-sm">
            <h4 className="text-xs font-semibold tracking-wide text-soft/70 uppercase mb-3">Meta</h4>
            <ul className="space-y-2 text-[12px] text-soft/80">
              <li><span className="font-medium text-soft">ID:</span> {dept._id?.slice(-8)}</li>
              <li><span className="font-medium text-soft">Categories:</span> {dept.categories?.length || 0}</li>
              <li><span className="font-medium text-soft">Officers:</span> {dept.officers?.length || 0}</li>
            </ul>
          </div>
          {editing && (
            <div className="rounded-lg border border-warning/40 bg-warning/15 text-warning text-[11px] p-3 flex items-start gap-2">
              <Info size={14} className="mt-0.5" /> Editing mode – unsaved changes will be lost if you leave.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepartmentDetail;
