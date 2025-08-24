import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getDepartmentById, updateDepartment } from '../../services/department.services';
import { useUser } from '@clerk/clerk-react';
import { ArrowLeft, Save } from 'lucide-react';

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

  if (loading) return <div className="text-sm text-gray-500 px-4">Loading...</div>;
  if (error) return <div className="text-sm text-rose-600 px-4">{error}</div>;
  if (!dept) return <div className="text-sm text-gray-500 px-4">Not found.</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-3 sm:px-4">
      <div className="flex items-center gap-3">
        <Link to="/departments" className="text-indigo-600 hover:underline text-sm inline-flex items-center gap-1"><ArrowLeft size={14}/> Back</Link>
        <h1 className="text-2xl font-semibold tracking-tight flex-1">Department Details</h1>
        {isAdmin && !editing && <button onClick={()=>setEditing(true)} className="px-4 h-9 rounded-md bg-indigo-600 text-white text-xs font-medium">Edit</button>}
      </div>
      <div className="bg-white/80 backdrop-blur rounded-xl border border-gray-200 p-6 space-y-6">
        {editing ? (
          <form onSubmit={save} className="space-y-4">
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
            <div className="flex gap-3 items-center">
              <button className="inline-flex items-center gap-1 px-4 h-10 rounded-lg bg-emerald-600 text-white text-sm font-medium"><Save size={14}/> Save</button>
              <button type="button" onClick={()=>{ setEditing(false); setForm({ name: dept.name, description: dept.description||'' }); }} className="text-xs text-gray-600 hover:underline">Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-800">{dept.name}</h2>
              <p className="text-sm text-gray-600">{dept.description || 'No description'}</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Categories</h3>
              <div className="flex flex-wrap gap-2">
                {dept.categories?.length ? dept.categories.map(c => (
                  <span key={c._id} className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-medium ring-1 ring-indigo-200">{c.name}</span>
                )) : <span className="text-xs text-gray-500">None</span>}
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-700">Officers</h3>
              <div className="flex flex-col gap-2">
                {dept.officers?.length ? dept.officers.map(o => (
                  <div key={o._id} className="text-xs rounded-md border border-gray-200 px-2 py-1 bg-gray-50/60 flex items-center justify-between">
                    <span>{o.name}</span><span className="text-gray-500">{o.role}</span>
                  </div>
                )) : <span className="text-xs text-gray-500">None</span>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DepartmentDetail;
