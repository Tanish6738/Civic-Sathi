import React, { useEffect, useState, useCallback } from 'react';
import { adminListCategories, createCategory, updateCategory, deleteCategory, restoreCategory, bulkImportCategories, exportCategories } from '../../../services/category.services';
import { getAllUsers } from '../../../services/user.services';

const initialForm = { name: '', description: '', keywords: '' };

export default function CategoryManager(){
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const [page,setPage]=useState(1); const [limit,setLimit]=useState(20);
  const [search,setSearch]=useState('');
  const [includeDeleted,setIncludeDeleted]=useState(false);
  const [deletedOnly,setDeletedOnly]=useState(false);
  const [meta,setMeta]=useState(null);
  const [showOfficerModal,setShowOfficerModal]=useState(false);
  const [officers,setOfficers]=useState([]);
  const [officerSearch,setOfficerSearch]=useState('');
  const [selectedOfficers,setSelectedOfficers]=useState([]);
  const [form,setForm]=useState(initialForm);
  const [editing,setEditing]=useState(null);
  const [bulkText,setBulkText]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState(null);

  const load = useCallback(async()=>{
    setLoading(true); setError(null);
    try {
  const params={ page, limit, search:search||undefined, includeDeleted: includeDeleted ? 'true': undefined, deletedOnly: deletedOnly?'true':undefined, sort:'name' };
  const { items, meta } = await adminListCategories(params);
  setItems(items);
  setMeta(meta);
    } catch(e){ setError(e.message||'Failed'); }
    finally{ setLoading(false); }
  },[page,limit,search,includeDeleted,deletedOnly]);

  useEffect(()=>{ load(); },[load]);

  function onChange(e){ const {name,value}=e.target; setForm(f=>({...f,[name]:value})); }

  async function onSubmit(e){ e.preventDefault(); setBusy(true); setMessage(null); try {
    const payload={...form, keywords: form.keywords?form.keywords.split(',').map(k=>k.trim()).filter(Boolean):[]};
  if(editing){ await updateCategory(editing._id,payload); setMessage('Updated'); }
    else { await createCategory(payload); setMessage('Created'); }
    setForm(initialForm); setEditing(null); load();
  } catch(e){ setMessage(e.message||'Save failed'); } finally{ setBusy(false); }
  }

  async function doDelete(id){ if(!window.confirm('Soft delete this category?')) return; setBusy(true); try { await deleteCategory(id); load(); } finally{ setBusy(false); } }
  async function doRestore(id){ setBusy(true); try { await restoreCategory(id); load(); } finally{ setBusy(false); } }

  async function doBulkImport(){ if(!bulkText.trim()) return; setBusy(true); setMessage(null); try {
    const rows = bulkText.split('\n').map(l=>l.trim()).filter(Boolean).map(line=>{ const [name,description,...kw]=line.split('|'); return { name, description, keywords: kw.length? kw.join(' ').split(',').map(k=>k.trim()):[] }; });
    const res = await bulkImportCategories({ categories: rows, options:{ restoreDeleted:true } });
    setMessage(`Bulk: created ${res.created?.length||0}, updated ${res.updated?.length||0}, restored ${res.restored?.length||0}, errors ${res.errors?.length||0}`);
    load();
  } catch(e){ setMessage(e.message||'Bulk failed'); } finally { setBusy(false); }
  }

  async function doExport(format='csv'){ try { const data= await exportCategories({ format }); if(format==='json'){ const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='categories.json'; a.click(); URL.revokeObjectURL(url);} else { const blob=new Blob([data],{type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='categories.csv'; a.click(); URL.revokeObjectURL(url);} } catch(e){ setMessage('Export failed'); } }

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap gap-2 items-end'>
        <div className='flex flex-col'>
          <label className='text-xs font-medium'>Search</label>
          <input value={search} onChange={e=>setSearch(e.target.value)} className='input input-sm' placeholder='name or keyword'/>
        </div>
        <label className='flex items-center gap-1 text-xs'>
          <input type='checkbox' checked={includeDeleted} onChange={e=>setIncludeDeleted(e.target.checked)}/> Include deleted
        </label>
        <label className='flex items-center gap-1 text-xs'>
          <input type='checkbox' checked={deletedOnly} onChange={e=>setDeletedOnly(e.target.checked)}/> Deleted only
        </label>
        <button onClick={()=>{setPage(1);load();}} className='btn btn-sm'>Filter</button>
        <button onClick={()=>{setSearch('');setIncludeDeleted(false);setDeletedOnly(false);setPage(1);load();}} className='btn btn-sm btn-ghost'>Reset</button>
        <div className='ml-auto flex gap-2'>
          <button onClick={()=>doExport('csv')} className='btn btn-sm'>Export CSV</button>
          <button onClick={()=>doExport('json')} className='btn btn-sm'>Export JSON</button>
        </div>
      </div>

      <form onSubmit={onSubmit} className='p-4 rounded-md border border-default flex flex-col gap-3 bg-surface/60'>
        <h3 className='font-semibold text-sm'>{editing?'Edit Category':'New Category'}</h3>
        <div className='grid gap-3 md:grid-cols-3'>
          <input name='name' value={form.name} onChange={onChange} placeholder='Name' required className='input input-sm col-span-1'/>
          <input name='description' value={form.description} onChange={onChange} placeholder='Description' className='input input-sm md:col-span-1'/>
          <input name='keywords' value={form.keywords} onChange={onChange} placeholder='comma keywords' className='input input-sm md:col-span-1'/>
        </div>
        <div className='flex gap-2'>
          <button disabled={busy} className='btn btn-primary btn-sm'>{editing?'Update':'Create'}</button>
          {editing && <button type='button' onClick={()=>{setEditing(null);setForm(initialForm);}} className='btn btn-ghost btn-sm'>Cancel</button>}
        </div>
        {message && <div className='text-xs text-soft'>{message}</div>}
      </form>

      <div className='p-4 rounded-md border border-default bg-surface/60'>
        <h3 className='font-semibold text-sm mb-2'>Bulk Import (one per line: name|description|keyword1,keyword2)</h3>
        <textarea value={bulkText} onChange={e=>setBulkText(e.target.value)} className='textarea textarea-sm w-full h-24'/>
        <div className='mt-2 flex gap-2'>
          <button disabled={busy} onClick={doBulkImport} className='btn btn-sm btn-secondary'>Process Bulk</button>
          <button type='button' onClick={()=>setBulkText('')} className='btn btn-sm btn-ghost'>Clear</button>
        </div>
      </div>

  <div className='overflow-auto border border-default rounded-md'>
        <table className='min-w-full text-sm'>
          <thead className='bg-surface/70'>
            <tr className='text-left'>
              <th className='px-3 py-2'>Name</th>
              <th className='px-3 py-2'>Description</th>
              <th className='px-3 py-2'>Keywords</th>
              <th className='px-3 py-2'>Status</th>
              <th className='px-3 py-2 w-40'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className='px-3 py-4 text-center text-soft'>Loading...</td></tr>}
            {!loading && items && items.length===0 && <tr><td colSpan={5} className='px-3 py-4 text-center text-soft/70'>No categories</td></tr>}
            {items && items.map(cat => (
              <tr key={cat._id} className='border-t border-default/40 hover:bg-surface/40'>
                <td className='px-3 py-2 font-medium'>{cat.name}</td>
                <td className='px-3 py-2'>{cat.description}</td>
                <td className='px-3 py-2 text-xs'>{(cat.keywords||[]).join(', ')}</td>
                <td className='px-3 py-2'>{cat.isDeleted? <span className='text-red-500'>Deleted</span>: <span className='text-green-500'>Active</span>}</td>
                <td className='px-3 py-2 flex gap-2'>
                  <button className='btn btn-xs' onClick={()=>{setEditing(cat); setForm({ name:cat.name, description:cat.description||'', keywords:(cat.keywords||[]).join(',') });}}>Edit</button>
                  <button className='btn btn-xs btn-secondary' onClick={()=>{setEditing(cat); setSelectedOfficers(cat.defaultOfficers||[]); setShowOfficerModal(true);}}>Officers</button>
                  {!cat.isDeleted && <button className='btn btn-xs btn-error' onClick={()=>doDelete(cat._id)}>Delete</button>}
                  {cat.isDeleted && <button className='btn btn-xs btn-accent' onClick={()=>doRestore(cat._id)}>Restore</button>}
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

      {showOfficerModal && (
        <OfficerModal
          onClose={()=>{setShowOfficerModal(false);} }
          category={editing}
          selected={selectedOfficers}
          onChange={setSelectedOfficers}
          loadOfficers={async (q)=>{ const list= await getAllUsers({ role:'officer', search:q }); setOfficers(list); }}
        />
      )}
    </div>
  );
}

function OfficerModal({ onClose, category, selected, onChange, loadOfficers }) {
  const [query,setQuery]=useState('');
  const [loading,setLoading]=useState(false);
  const [list,setList]=useState([]);
  useEffect(()=>{ (async()=>{ setLoading(true); await loadOfficers(''); setLoading(false); })(); },[loadOfficers]);
  async function search(){ setLoading(true); await loadOfficers(query); setLoading(false); }
  function toggle(id){ onChange(sel => sel.includes(id)? sel.filter(x=>x!==id): [...sel,id]); }
  async function save(){ // reuse updateCategory
    // minimal inline import to avoid circular
    const { updateCategory } = await import('../../../services/category.services');
    await updateCategory(category._id, { defaultOfficers: selected });
    onClose();
  }
  return (
    <div className='fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
      <div className='bg-surface rounded-md shadow-lg w-full max-w-lg p-4 flex flex-col gap-4'>
        <div className='flex items-center justify-between'>
          <h3 className='font-semibold text-sm'>Assign Officers – {category?.name}</h3>
          <button onClick={onClose} className='btn btn-xs btn-ghost'>✕</button>
        </div>
        <div className='flex gap-2'>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder='Search officers' className='input input-sm flex-1'/>
          <button onClick={search} className='btn btn-sm'>Search</button>
        </div>
        <div className='border border-default rounded max-h-56 overflow-auto divide-y divide-default/40 text-xs'>
          {loading && <div className='p-3 text-soft'>Loading...</div>}
          {!loading && list && list.length===0 && <div className='p-3 text-soft/60'>No officers</div>}
          {list && list.map(u => (
            <label key={u._id} className='flex items-center gap-2 p-2 hover:bg-surface/60 cursor-pointer'>
              <input type='checkbox' checked={selected.includes(u._id)} onChange={()=>toggle(u._id)}/>
              <span className='flex-1'>{u.name}</span>
              <span className='text-[10px] uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded'>{u.role}</span>
            </label>
          ))}
        </div>
        <div className='flex justify-end gap-2'>
          <button onClick={save} className='btn btn-primary btn-sm'>Save</button>
          <button onClick={onClose} className='btn btn-sm btn-ghost'>Cancel</button>
        </div>
      </div>
    </div>
  );
}
