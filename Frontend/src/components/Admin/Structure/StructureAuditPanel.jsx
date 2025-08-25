import React, { useEffect, useState } from 'react';
import api from '../../../utils/axios';

export default function StructureAuditPanel(){
  const [logs,setLogs]=useState([]);
  const [loading,setLoading]=useState(false);
  const [action,setAction]=useState('');
  const [categoryId,setCategoryId]=useState('');
  const [departmentId,setDepartmentId]=useState('');
  const [page,setPage]=useState(1);
  const [limit,setLimit]=useState(20);
  const [meta,setMeta]=useState(null);
  const [expanded,setExpanded]=useState(null);

  async function load(){
    setLoading(true);
    try {
      const params=new URLSearchParams();
      params.append('structureOnly','true');
      params.append('page',page);
      params.append('limit',limit);
      if(action) params.append('action',action);
      if(categoryId) params.append('categoryId',categoryId);
      if(departmentId) params.append('departmentId',departmentId);
      const { data } = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(data.data.items||[]);
      setMeta(data.data.meta||null);
    } catch(e){ console.error(e); }
    finally{ setLoading(false); }
  }

  useEffect(()=>{ load(); },[page,limit]);

  return (
    <div className='p-4 rounded-md border border-default bg-surface/60 flex flex-col gap-3'>
      <h3 className='font-semibold text-sm'>Structure Audit History</h3>
      <div className='flex flex-wrap gap-2 text-xs'>
        <input placeholder='Action (optional)' value={action} onChange={e=>setAction(e.target.value)} className='input input-xs'/>
        <input placeholder='CategoryId' value={categoryId} onChange={e=>setCategoryId(e.target.value)} className='input input-xs'/>
        <input placeholder='DepartmentId' value={departmentId} onChange={e=>setDepartmentId(e.target.value)} className='input input-xs'/>
        <button onClick={()=>{setPage(1);load();}} className='btn btn-xs'>Filter</button>
        <button onClick={()=>{setAction('');setCategoryId('');setDepartmentId('');setPage(1);load();}} className='btn btn-xs btn-ghost'>Reset</button>
      </div>
      <div className='max-h-72 overflow-auto border border-default rounded-md'>
        <table className='min-w-full text-xs'>
          <thead className='bg-surface/70'>
            <tr className='text-left'>
              <th className='px-2 py-1'>Time</th>
              <th className='px-2 py-1'>Action</th>
              <th className='px-2 py-1'>Actor</th>
              <th className='px-2 py-1'>Entity</th>
              <th className='px-2 py-1'>Changes</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className='px-3 py-4 text-center text-soft'>Loading...</td></tr>}
            {!loading && logs.length===0 && <tr><td colSpan={5} className='px-3 py-4 text-center text-soft/60'>No audit events</td></tr>}
            {logs.map(l => {
              const entityId = l.meta?.categoryId || l.meta?.departmentId;
              const diff = l.meta?.diff || null;
              const changeKeys = diff ? Object.keys(diff) : [];
              const isOpen = expanded===l._id;
              return (
                <React.Fragment key={l._id}>
                  <tr className='border-t border-default/40 hover:bg-surface/40 cursor-pointer' onClick={()=>setExpanded(e=> e===l._id? null : l._id)}>
                    <td className='px-2 py-1 whitespace-nowrap'>{new Date(l.createdAt).toLocaleTimeString()}</td>
                    <td className='px-2 py-1'>{l.action}</td>
                    <td className='px-2 py-1'>{l.user?.name||'—'}</td>
                    <td className='px-2 py-1'>{entityId||'—'}</td>
                    <td className='px-2 py-1 text-[10px] font-mono'>{changeKeys.join(',')}</td>
                  </tr>
                  {isOpen && diff && (
                    <tr className='bg-surface/40 text-[11px] font-mono'>
                      <td colSpan={5} className='px-3 py-2'>
                        <DiffBlock diff={diff} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      {meta && <div className='flex items-center justify-between text-[10px] mt-1'>
        <div>Page {meta.page} / {Math.ceil((meta.total||0)/(meta.limit||limit)) || 1} • Total {meta.total}</div>
        <div className='flex gap-1'>
          <button className='btn btn-2xs' disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
          <button className='btn btn-2xs' disabled={(page*limit)>= (meta.total||0)} onClick={()=>setPage(p=>p+1)}>Next</button>
          <select value={limit} onChange={e=>{setLimit(parseInt(e.target.value,10)); setPage(1);}} className='select select-2xs'>
            {[10,20,50,100].map(n=> <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>}
    </div>
  );
}

function DiffBlock({ diff }) {
  return (
    <div className='flex flex-col gap-2'>
      {Object.entries(diff).map(([field,change])=>{
        return (
          <div key={field} className='border border-default/40 rounded p-2'>
            <div className='text-[10px] uppercase tracking-wide font-semibold mb-1 text-soft'>{field}</div>
            <div className='grid md:grid-cols-2 gap-2'>
              <pre className='bg-surface/60 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap'>{JSON.stringify(change.before,null,2)}</pre>
              <pre className='bg-surface/60 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap'>{JSON.stringify(change.after,null,2)}</pre>
            </div>
          </div>
        );
      })}
    </div>
  );
}
