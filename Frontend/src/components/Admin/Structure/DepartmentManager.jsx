import React, { useEffect, useState, useCallback } from 'react';
import { adminListDepartments, createDepartment, updateDepartment, deleteDepartment, restoreDepartment, bulkAssignDepartment } from '../../../services/department.services';
import { getCategories } from '../../../services/category.services';

const initialDept = { name:'', description:'', categories:[], officers:[] };

export default function DepartmentManager(){
  const [departments,setDepartments]=useState([]);
  const [cats,setCats]=useState([]);
  const [loading,setLoading]=useState(false);
  const [search,setSearch]=useState('');
  const [includeDeleted,setIncludeDeleted]=useState(false);
  const [deletedOnly,setDeletedOnly]=useState(false);
  const [page,setPage]=useState(1);
  const [limit,setLimit]=useState(20);
  const [meta,setMeta]=useState(null);
  const [form,setForm]=useState(initialDept);
  const [editing,setEditing]=useState(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState(null);

  const load = useCallback(async()=>{
    setLoading(true);
    try {
  const params={ page, limit, search:search||undefined, includeDeleted: includeDeleted ? 'true': undefined, deletedOnly: deletedOnly?'true':undefined, sort:'name' };
  const { items, meta } = await adminListDepartments(params);
  setDepartments(items);
  setMeta(meta);
    } finally { setLoading(false); }
  },[page,limit,search,includeDeleted,deletedOnly]);

  const loadCats = useCallback(async()=>{
    try { const c = await getCategories({ limit:500 }); setCats(c); } catch(e){}
  },[]);

  useEffect(()=>{ load(); loadCats(); },[load, loadCats]);

  function onChange(e){ const {name,value}=e.target; setForm(f=>({...f,[name]:value})); }
  function toggleCat(id){ setForm(f=>({...f,categories: f.categories.includes(id)? f.categories.filter(x=>x!==id): [...f.categories,id]})); }

  async function onSubmit(e){ e.preventDefault(); setBusy(true); setMessage(null); try {
    const payload={ name: form.name, description: form.description, categories: form.categories };
    if(editing){ await updateDepartment(editing._id,payload); setMessage('Updated'); }
    else { await createDepartment(payload); setMessage('Created'); }
    setForm(initialDept); setEditing(null); load();
  } catch(e){ setMessage(e.message||'Save failed'); } finally { setBusy(false); }
  }

  async function doDelete(id){ if(!window.confirm('Soft delete department?')) return; setBusy(true); try { await deleteDepartment(id); load(); } finally{ setBusy(false); } }
  async function doRestore(id){ setBusy(true); try { await restoreDepartment(id); load(); } finally{ setBusy(false); } }

  async function doBulkAssign(dept){ const selected = prompt('Enter category names (comma) to add'); if(!selected) return; const names=selected.split(',').map(s=>s.trim()).filter(Boolean); const ids=cats.filter(c=>names.includes(c.name)).map(c=>c._id); if(!ids.length){alert('No matching categories');return;} setBusy(true); try { await bulkAssignDepartment({ departmentId: dept._id, addCategories: ids }); load(); } finally{ setBusy(false); } }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap gap-3 items-end'>
        <div className='flex flex-col'>
          <label className='text-xs font-medium'>Search name</label>
          <input value={search} onChange={e=>setSearch(e.target.value)} className='input input-sm' placeholder='Department name'/>
        </div>
        <label className='flex items-center gap-1 text-xs'>
          <input type='checkbox' checked={includeDeleted} onChange={e=>setIncludeDeleted(e.target.checked)}/> Include deleted
        </label>
        <label className='flex items-center gap-1 text-xs'>
          <input type='checkbox' checked={deletedOnly} onChange={e=>setDeletedOnly(e.target.checked)}/> Deleted only
        </label>
  <button onClick={()=>{setPage(1);load();}} className='btn btn-sm'>Filter</button>
  <button onClick={()=>{setSearch('');setIncludeDeleted(false);setDeletedOnly(false);setPage(1);load();}} className='btn btn-sm btn-ghost'>Reset</button>
      </div>

      <form onSubmit={onSubmit} className='p-4 rounded-md border border-default flex flex-col gap-3 bg-surface/60'>
        <h3 className='font-semibold text-sm'>{editing?'Edit Department':'New Department'}</h3>
        <div className='grid gap-3 md:grid-cols-3'>
          <input name='name' value={form.name} onChange={onChange} placeholder='Name' required className='input input-sm col-span-1'/>
          <input name='description' value={form.description} onChange={onChange} placeholder='Description' className='input input-sm col-span-2'/>
        </div>
        <div className='flex flex-wrap gap-2 text-xs'>
          {cats.map(c=>{
            const active = form.categories.includes(c._id);
            return <button key={c._id} type='button' onClick={()=>toggleCat(c._id)} className={`px-2 py-1 rounded border text-xs ${active? 'bg-primary/20 border-primary text-primary':'border-default hover:border-primary/60 text-soft'}`}>{c.name}</button>;
          })}
        </div>
        <div className='flex gap-2'>
          <button disabled={busy} className='btn btn-primary btn-sm'>{editing?'Update':'Create'}</button>
          {editing && <button type='button' onClick={()=>{setEditing(null);setForm(initialDept);}} className='btn btn-ghost btn-sm'>Cancel</button>}
        </div>
        {message && <div className='text-xs text-soft'>{message}</div>}
      </form>

      <div className='overflow-auto border border-default rounded-md'>
        <table className='min-w-full text-sm'>
          <thead className='bg-surface/70'>
            <tr className='text-left'>
              <th className='px-3 py-2'>Name</th>
              <th className='px-3 py-2'>Description</th>
              <th className='px-3 py-2'>Categories</th>
              <th className='px-3 py-2'>Status</th>
              <th className='px-3 py-2 w-48'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className='px-3 py-4 text-center text-soft'>Loading...</td></tr>}
            {!loading && departments && departments.length===0 && <tr><td colSpan={5} className='px-3 py-4 text-center text-soft/70'>No departments</td></tr>}
            {departments.map(dept => (
              <tr key={dept._id} className='border-t border-default/40 hover:bg-surface/40'>
                <td className='px-3 py-2 font-medium'>{dept.name}</td>
                <td className='px-3 py-2'>{dept.description}</td>
                <td className='px-3 py-2 text-xs'>{(dept.categories||[]).length}</td>
                <td className='px-3 py-2'>{dept.isDeleted? <span className='text-red-500'>Deleted</span>: <span className='text-green-500'>Active</span>}</td>
                <td className='px-3 py-2 flex flex-wrap gap-2'>
                  <button className='btn btn-xs' onClick={()=>{setEditing(dept); setForm({ name:dept.name, description:dept.description||'', categories:(dept.categories||[]).map(c=>c._id||c) });}}>Edit</button>
                  <button className='btn btn-xs btn-accent' onClick={()=>doBulkAssign(dept)}>Bulk Add Cats</button>
                  {!dept.isDeleted && <button className='btn btn-xs btn-error' onClick={()=>doDelete(dept._id)}>Delete</button>}
                  {dept.isDeleted && <button className='btn btn-xs btn-secondary' onClick={()=>doRestore(dept._id)}>Restore</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {meta && <div className='flex items-center justify-between p-2 text-xs text-soft/80'>
          <div>Page {meta.page} / {Math.ceil((meta.total||0)/(meta.limit||limit)) || 1} • Total {meta.total}</div>
          <div className='flex gap-1'>
            <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className='btn btn-xs'>Prev</button>
            <button disabled={meta && (page*meta.limit)>=meta.total} onClick={()=>setPage(p=>p+1)} className='btn btn-xs'>Next</button>
            <select value={limit} onChange={e=>{setLimit(parseInt(e.target.value,10)); setPage(1);}} className='select select-xs'>
              {[10,20,50,100].map(n=> <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>}
      </div>
    </div>
  );
}
