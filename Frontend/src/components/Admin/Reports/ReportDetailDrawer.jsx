import React, { useEffect, useState, useMemo } from 'react';
import { X, Clock, UserPlus, Save, ShieldCheck, CheckSquare, CheckCircle2, Loader2, Layers, ChevronDown } from 'lucide-react';
import { updateReport } from '../../../services/report.services';
import { useToast } from '../../../contexts/ToastContext';

export default function ReportDetailDrawer({ report, onClose, users = [], onUpdated }) {
  const { notify } = useToast();
  const [assigned, setAssigned] = useState([]);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [tab, setTab] = useState('overview'); // mobile-first tab segmentation
  const [openStatus, setOpenStatus] = useState(false); // custom dropdown open state

  const statusOptions = ['submitted','assigned','in_progress','awaiting_verification','misrouted','verified','closed'];
  const statusMeta = {
    submitted: { label: 'Submitted', icon: <Layers size={14}/> , cls: 'bg-[rgba(var(--ds-warning),0.15)] text-[rgb(var(--ds-warning))] ring-1 ring-[rgba(var(--ds-warning),0.4)]' },
    assigned: { label: 'Assigned', icon: <UserPlus size={14}/> , cls: 'bg-[rgba(var(--ds-primary),0.15)] text-[rgb(var(--ds-primary))] ring-1 ring-[rgba(var(--ds-primary),0.4)]' },
    in_progress: { label: 'In Progress', icon: <Clock size={14}/> , cls: 'bg-[rgba(var(--ds-accent),0.18)] text-[rgb(var(--ds-accent))] ring-1 ring-[rgba(var(--ds-accent),0.45)]' },
    awaiting_verification: { label: 'Await Verify', icon: <CheckSquare size={14}/> , cls: 'bg-[rgba(var(--ds-primary),0.2)] text-[rgb(var(--ds-primary))] ring-1 ring-[rgba(var(--ds-primary),0.45)]' },
  misrouted: { label: 'Misrouted', icon: <ShieldCheck size={14}/> , cls: 'bg-[rgba(var(--ds-error),0.18)] text-[rgb(var(--ds-error))] ring-1 ring-[rgba(var(--ds-error),0.5)]' },
  verified: { label: 'Verified', icon: <ShieldCheck size={14}/> , cls: 'bg-[rgba(var(--ds-success),0.18)] text-[rgb(var(--ds-success))] ring-1 ring-[rgba(var(--ds-success),0.45)]' },
    closed: { label: 'Closed', icon: <CheckCircle2 size={14}/> , cls: 'bg-[rgba(var(--ds-text-soft),0.2)] text-[rgb(var(--ds-text-soft))] ring-1 ring-[rgba(var(--ds-text-soft),0.35)]' }
  };

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
      <div className="flex-1 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <aside className="w-full md:max-w-lg h-full bg-[rgb(var(--ds-surface))] shadow-2xl border-l border-[rgb(var(--ds-border))] flex flex-col animate-drawer-slide overflow-hidden">
        {/* Header */}
        <div className="relative px-4 md:px-5 h-14 flex items-center gap-3 border-b border-[rgba(var(--ds-border),0.6)] bg-gradient-to-r from-[rgba(var(--ds-muted),0.25)] to-[rgba(var(--ds-muted),0.15)] backdrop-blur">
          <button onClick={onClose} className="md:hidden h-8 w-8 inline-flex items-center justify-center rounded-md bg-[rgba(var(--ds-muted),0.4)] text-soft hover:bg-[rgba(var(--ds-muted),0.55)]"><X size={16}/></button>
          <h2 className="font-semibold text-sm md:text-lg leading-tight line-clamp-1 flex-1 text-[rgb(var(--ds-text))]">{report.title}</h2>
          <div className="hidden md:flex">
            <button onClick={onClose} className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-[rgba(var(--ds-muted),0.4)]"><X size={18}/></button>
          </div>
        </div>

        {/* Status selector (custom dropdown to avoid overflow) */}
        <div className="px-4 pt-4 pb-3 border-b border-[rgba(var(--ds-border),0.5)] bg-[rgba(var(--ds-surface),0.9)] backdrop-blur flex flex-col gap-2 relative">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-soft">Status</label>
          <div className="relative" onKeyDown={(e)=>{ if(e.key==='Escape') setOpenStatus(false); if(e.key==='Enter' || e.key===' ') { e.preventDefault(); setOpenStatus(o=>!o); } }}>
            <button type="button" aria-haspopup="listbox" aria-expanded={openStatus} onClick={()=>setOpenStatus(o=>!o)} className="w-full h-10 pl-3 pr-9 rounded-lg bg-[rgba(var(--ds-muted),0.35)] text-[11px] font-semibold text-left text-[rgb(var(--ds-text))] ring-1 ring-[rgba(var(--ds-border),0.5)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--ds-primary),0.5)] flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ring-1 ${statusMeta[status]?.cls || ''}`}>{statusMeta[status]?.icon}{statusMeta[status]?.label}</span>
            </button>
            <ChevronDown size={14} className={`pointer-events-none absolute top-1/2 -translate-y-1/2 right-3 text-soft transition-transform ${openStatus?'rotate-180':''}`} />
            {openStatus && (
              <ul role="listbox" className="absolute z-20 mt-1 left-0 right-0 max-h-56 overflow-auto thin-scrollbar rounded-lg border border-[rgba(var(--ds-border),0.6)] bg-[rgb(var(--ds-surface))] shadow-xl p-1 animate-in fade-in">
                {statusOptions.map(s => {
                  const active = status === s;
                  const meta = statusMeta[s];
                  return (
                    <li key={s}>
                      <button type="button" role="option" aria-selected={active} onClick={()=>{ setStatus(s); setOpenStatus(false); }} className={`w-full text-left px-2 py-2 rounded-md text-[11px] font-semibold flex items-center gap-2 ring-1 transition ${active? meta.cls + ' shadow-sm' : 'bg-[rgba(var(--ds-muted),0.25)] text-soft hover:bg-[rgba(var(--ds-muted),0.45)] ring-[rgba(var(--ds-border),0.4)]'}`}>{meta.icon}{meta.label}</button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          {openStatus && <div onClick={()=>setOpenStatus(false)} className="fixed inset-0 z-10" />}
        </div>

        {/* Tabs (mobile-first) */}
        <div className="flex md:hidden px-4 gap-2 pt-3 pb-2 border-b border-[rgba(var(--ds-border),0.4)] bg-[rgba(var(--ds-surface),0.85)]">
          {['overview','assign','history'].filter(t => t!=='history' || report.history?.length).map(t => (
            <button key={t} onClick={()=>setTab(t)} className={`h-8 px-3 rounded-lg text-[11px] font-semibold tracking-wide ring-1 transition ${tab===t ? 'bg-[rgb(var(--ds-primary))] text-white ring-[rgba(var(--ds-primary),0.5)]' : 'bg-[rgba(var(--ds-muted),0.35)] text-soft ring-[rgba(var(--ds-border),0.5)] hover:bg-[rgba(var(--ds-muted),0.5)]'}`}>{t==='overview'? 'Overview': t==='assign'? 'Assign': 'History'}</button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto thin-scrollbar px-4 md:px-5 py-5 space-y-8 text-sm">
          {(tab==='overview' || !/assign|history/.test(tab)) && (
            <section className="space-y-4">
              <div>
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-soft mb-2">Overview</h3>
                <p className="text-[rgb(var(--ds-text))] leading-relaxed whitespace-pre-wrap text-xs md:text-sm bg-[rgba(var(--ds-muted),0.25)] rounded-lg p-3 border border-[rgba(var(--ds-border),0.5)]">{report.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-[11px] md:text-xs">
                <div className="space-y-1">
                  <p className="text-soft">Category</p>
                  <p className="font-medium text-[rgb(var(--ds-text))]">{report.category?.name || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-soft">Reporter</p>
                  <p className="font-medium text-[rgb(var(--ds-text))] break-all">{report.reporter?.name || report.reporter?.email || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-soft">Created</p>
                  <p className="font-medium inline-flex items-center gap-1 text-[rgb(var(--ds-text))]"><Clock size={12}/> {new Date(report.createdAt).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-soft">Current Status</p>
                  <p className="font-medium text-[rgb(var(--ds-text))]">{statusMeta[status]?.label || status}</p>
                </div>
                {report.status === 'misrouted' && (
                  <div className="space-y-1 col-span-2">
                    <p className="text-soft">Misroute Reason</p>
                    <p className="font-medium text-[rgb(var(--ds-error))] bg-[rgba(var(--ds-error),0.12)] border border-[rgba(var(--ds-error),0.4)] rounded-md px-3 py-2 text-[11px] leading-relaxed whitespace-pre-wrap">
                      {report.misrouteReason || 'No reason provided.'}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {(tab==='assign' || (!/overview|history/.test(tab))) && (
            <section className="space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-soft mb-1 flex items-center gap-1"><UserPlus size={12}/> Assign Officers</h3>
              <div className="flex flex-wrap gap-2">
                {officers.map(o => {
                  const active = assigned.includes(o._id);
                  return (
                    <button key={o._id} type="button" onClick={()=>toggleAssign(o._id)} className={`px-2 py-1 rounded-md text-[11px] font-medium ring-1 transition ${active ? 'bg-[rgb(var(--ds-primary))] text-white ring-[rgba(var(--ds-primary),0.5)] shadow-sm' : 'bg-[rgba(var(--ds-muted),0.35)] text-soft hover:bg-[rgba(var(--ds-muted),0.5)] ring-[rgba(var(--ds-border),0.5)]'}`}>{o.name || o.email}</button>
                  );
                })}
                {officers.length===0 && <p className="text-xs text-soft/70">No officers available.</p>}
              </div>
              {assigned.length>0 && (
                <div className="pt-2 flex flex-wrap gap-1 text-[10px]">
                  {assigned.map(id => {
                    const o = officers.find(x=>x._id===id);
                    return <span key={id} className="px-2 py-0.5 rounded-md bg-[rgba(var(--ds-success),0.15)] text-[rgb(var(--ds-success))] ring-1 ring-[rgba(var(--ds-success),0.4)]">{o?.name || o?.email || id}</span>;
                  })}
                </div>
              )}
            </section>
          )}

          {(tab==='history' || (!/overview|assign/.test(tab))) && !!report.history?.length && (
            <section className="space-y-2">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-soft mb-1">History</h3>
              <ol className="space-y-2 max-h-72 overflow-y-auto pr-1 thin-scrollbar">
                {report.history.slice().reverse().map((h,i)=>(
                  <li key={i} className="text-xs flex flex-col gap-0.5 bg-[rgba(var(--ds-muted),0.25)] border border-[rgba(var(--ds-border),0.5)] rounded-lg p-2">
                    <span className="text-[rgb(var(--ds-text))]"><span className="font-semibold">{h.role}</span> {h.action}</span>
                    <span className="text-[10px] text-soft">{new Date(h.at).toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* Sticky action bar */}
        <div className="relative p-3 md:p-4 border-t border-[rgba(var(--ds-border),0.5)] bg-[rgba(var(--ds-surface),0.95)] backdrop-blur flex items-center gap-3">
          <button disabled={saving} onClick={save} className="inline-flex items-center gap-1 h-10 px-5 rounded-lg bg-[rgb(var(--ds-primary))] text-white text-[13px] font-semibold disabled:opacity-50 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--ds-primary),0.5)]">
            {saving? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
            {saving? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={onClose} className="h-10 px-5 rounded-lg bg-[rgba(var(--ds-muted),0.3)] text-[rgb(var(--ds-text))] text-[13px] font-semibold hover:bg-[rgba(var(--ds-muted),0.45)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--ds-primary),0.4)]">Close</button>
          <div className="ml-auto text-[10px] text-soft hidden md:block">ESC to close</div>
          {saving && (
            <div className="absolute left-0 right-0 -top-[2px] h-1 overflow-hidden rounded-t">
              <div className="h-full w-full bg-linear-to-r from-[rgb(var(--ds-primary))] via-[rgb(var(--ds-secondary))] to-[rgb(var(--ds-primary))] animate-[progressSlide_1.1s_linear_infinite]" />
            </div>
          )}
        </div>
      </aside>
      <style>{`@keyframes drawer-slide{from{transform:translateX(60px);opacity:0}to{transform:translateX(0);opacity:1}}.animate-drawer-slide{animation:drawer-slide .4s cubic-bezier(.4,0,.2,1) both}@keyframes progressSlide{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
    </div>
  );
}
