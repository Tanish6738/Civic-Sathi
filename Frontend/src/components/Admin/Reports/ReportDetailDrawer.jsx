import React, { useEffect, useState, useMemo } from 'react';
import { X, Clock, UserPlus, Save } from 'lucide-react';
import { updateReport } from '../../../services/report.services';
import { useToast } from '../../../contexts/ToastContext';

export default function ReportDetailDrawer({ report, onClose, users = [], onUpdated }) {
  const { notify } = useToast();
  const [assigned, setAssigned] = useState([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const statusOptions = ['submitted','assigned','in_progress','awaiting_verification','verified','closed'];

  useEffect(()=>{
    function onKey(e){ if(e.key==='Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return ()=> document.removeEventListener('keydown', onKey);
  },[onClose]);

  useEffect(()=>{
    if(report){
      setAssigned(report.assignedTo?.map(u=>u._id || u) || []);
      setStatus(report.status || '');
    }
  },[report]);

  const officers = useMemo(()=> users.filter(u=> ['officer','admin','superadmin'].includes(u.role)), [users]);

  if(!report) return null;

  async function save(){
    setSaving(true);
    try {
      const updated = await updateReport(report._id, { assignedTo: assigned, status, action: 'updated via drawer', byUserId: report.reporter?._id });
      notify('Report updated','success');
      onUpdated && onUpdated(updated);
    } catch(e){
      notify(e?.response?.data?.message || 'Update failed','error');
    } finally { setSaving(false); }
  }

  function toggleAssign(id){
    setAssigned(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-[1px] animate-fade-in" onClick={onClose} />
      <aside className="w-full max-w-lg h-full bg-white shadow-xl border-l flex flex-col animate-drawer-slide overflow-y-auto">
        <div className="flex items-center justify-between px-5 h-14 border-b bg-gradient-to-r from-white to-indigo-50/40">
          <h2 className="font-semibold text-lg truncate">{report.title}</h2>
          <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-gray-100"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-6 text-sm">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Overview</h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{report.description}</p>
          </section>
          <section className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-gray-500">Status</p>
              <select value={status} onChange={e=>setStatus(e.target.value)} className="mt-0.5 w-full h-8 text-xs rounded-md border border-gray-300 bg-white px-2">
                {statusOptions.map(s=> <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <p className="text-gray-500">Category</p>
              <p className="font-medium text-gray-800">{report.category?.name || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Reporter</p>
              <p className="font-medium text-gray-800">{report.reporter?.name || report.reporter?.email || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Created</p>
              <p className="font-medium inline-flex items-center gap-1"><Clock size={12}/> {new Date(report.createdAt).toLocaleString()}</p>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1"><UserPlus size={12}/> Assign Officers</h3>
            <div className="flex flex-wrap gap-2">
              {officers.map(o => {
                const active = assigned.includes(o._id);
                return (
                  <button key={o._id} type="button" onClick={()=>toggleAssign(o._id)} className={`px-2 py-1 rounded-md text-[11px] font-medium ring-1 transition ${active ? 'bg-indigo-600 text-white ring-indigo-500 shadow-sm' : 'bg-gray-100 text-gray-700 ring-gray-300 hover:bg-gray-200'}`}>{o.name || o.email}</button>
                );
              })}
              {officers.length===0 && <p className="text-xs text-gray-400">No officers available.</p>}
            </div>
          </section>

          {!!report.history?.length && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">History</h3>
              <ol className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {report.history.slice().reverse().map((h,i)=>(
                  <li key={i} className="text-gray-700 text-xs flex flex-col">
                    <span><span className="font-medium">{h.role}</span> {h.action}</span>
                    <span className="text-[10px] text-gray-400">{new Date(h.at).toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
        <div className="mt-auto p-4 border-t bg-gray-50 flex items-center gap-3">
          <button disabled={saving} onClick={save} className="inline-flex items-center gap-1 h-10 px-4 rounded-md bg-indigo-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-indigo-500"><Save size={16}/> Save</button>
          <button onClick={onClose} className="h-10 px-4 rounded-md bg-white border text-sm font-medium text-gray-700 hover:bg-gray-50">Close</button>
        </div>
      </aside>
      <style>{`@keyframes drawer-slide{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}.animate-drawer-slide{animation:drawer-slide .35s cubic-bezier(.4,0,.2,1) both}`}</style>
    </div>
  );
}
