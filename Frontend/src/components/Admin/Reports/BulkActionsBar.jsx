import React, { useEffect, useRef, useState } from 'react';
import { bulkUpdateReports } from '../../../services/report.services';
import { Loader2, CheckCircle2, XCircle, Clock, CheckSquare, ShieldCheck, X, ChevronDown } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';

// Local status metadata (align with global tokens if available)
const STATUS_OPTIONS = [
  { value: 'in_progress', label: 'In Progress', icon: <Clock size={14}/> , cls: 'bg-[rgba(var(--ds-accent),0.12)] text-[rgb(var(--ds-accent))] ring-1 ring-[rgba(var(--ds-accent),0.35)]' },
  { value: 'awaiting_verification', label: 'Await Verify', icon: <CheckSquare size={14}/> , cls: 'bg-[rgba(var(--ds-primary),0.15)] text-[rgb(var(--ds-primary))] ring-1 ring-[rgba(var(--ds-primary),0.35)]' },
  { value: 'verified', label: 'Verified', icon: <ShieldCheck size={14}/> , cls: 'bg-[rgba(var(--ds-success),0.18)] text-[rgb(var(--ds-success))] ring-1 ring-[rgba(var(--ds-success),0.45)]' },
  { value: 'closed', label: 'Closed', icon: <CheckCircle2 size={14}/> , cls: 'bg-[rgba(var(--ds-text-soft),0.18)] text-[rgb(var(--ds-text-soft))] ring-1 ring-[rgba(var(--ds-text-soft),0.4)]' }
];

export default function BulkActionsBar({ selectedIds = [], onDone }) {
  const [status, setStatus] = useState('');
  const [openList, setOpenList] = useState(false); // mobile-first dropdown / chips toggle
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);
  const { notify } = useToast();

  useEffect(()=>{
    function onDoc(e){
      if(!openList) return;
      if(listRef.current && !listRef.current.contains(e.target)) setOpenList(false);
    }
    document.addEventListener('mousedown', onDoc);
    return ()=> document.removeEventListener('mousedown', onDoc);
  },[openList]);

  async function apply(){
    if(!status || selectedIds.length===0) return;
    setLoading(true);
    try {
      await bulkUpdateReports({ ids: selectedIds, status });
      onDone && onDone(status);
      notify('Bulk status applied','success');
      setStatus('');
    } catch(e){
      notify(e?.response?.data?.message || 'Bulk update failed','error');
    } finally { setLoading(false); }
  }

  function reset(){ setStatus(''); }

  if (selectedIds.length === 0) return null;

  return (
    <div className="relative group text-xs">
      <div className="flex flex-col md:flex-row md:items-center gap-3 p-4 md:p-3 rounded-2xl md:rounded-xl border bg-gradient-to-r from-[rgba(var(--ds-primary),0.08)] via-[rgba(var(--ds-secondary),0.08)] to-[rgba(var(--ds-primary),0.08)] border-[rgba(var(--ds-border),0.6)] shadow-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-[rgb(var(--ds-primary))] bg-[rgba(var(--ds-primary),0.12)] px-2 py-1 rounded-md ring-1 ring-[rgba(var(--ds-primary),0.35)]">{selectedIds.length} selected</span>
        </div>

        {/* Mobile-first condensed picker */}
        <div className="md:hidden">
          <button onClick={()=>setOpenList(o=>!o)} className="w-full h-9 px-3 inline-flex items-center justify-between rounded-lg bg-[rgba(var(--ds-muted),0.25)] text-[rgb(var(--ds-text))] font-medium focus:outline-none focus:ring-2 focus:ring-[rgba(var(--ds-primary),0.5)]">
            <span className="truncate text-[11px]">{status? `Status: ${STATUS_OPTIONS.find(s=>s.value===status)?.label}` : 'Choose status'}</span>
            <ChevronDown size={14} className={`transition-transform ${openList?'rotate-180':''}`} />
          </button>
          {openList && (
            <ul ref={listRef} className="mt-2 grid grid-cols-2 gap-2 p-2 rounded-xl border border-[rgba(var(--ds-border),0.6)] bg-[rgb(var(--ds-surface))] shadow-xl animate-in fade-in slide-in-from-top-1 max-h-52 overflow-y-auto thin-scrollbar">
              {STATUS_OPTIONS.map(opt => {
                const active = status === opt.value;
                return (
                  <li key={opt.value}>
                    <button type="button" onClick={()=>{ setStatus(opt.value); setOpenList(false); }} className={`w-full h-9 px-2 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 ring-1 transition ${active? opt.cls + ' ring-2 !ring-[rgb(var(--ds-primary))] shadow-sm' : 'bg-[rgba(var(--ds-muted),0.35)] text-soft hover:bg-[rgba(var(--ds-muted),0.5)] ring-[rgba(var(--ds-border),0.5)]'}`}>{opt.icon}{opt.label}</button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Desktop chip selector */}
        <div className="hidden md:flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map(opt => {
            const active = status === opt.value;
            return (
              <button key={opt.value} type="button" onClick={()=>setStatus(opt.value)} className={`h-8 px-2.5 rounded-md text-[10px] font-semibold inline-flex items-center gap-1 ring-1 transition ${active? opt.cls + ' shadow-sm' : 'bg-[rgba(var(--ds-muted),0.35)] text-soft hover:bg-[rgba(var(--ds-muted),0.5)] ring-[rgba(var(--ds-border),0.5)]'}`}>{opt.icon}{opt.label}</button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 md:ml-auto">
          {!!status && (
            <button onClick={reset} type="button" className="h-9 px-3 rounded-lg bg-[rgba(var(--ds-error),0.1)] text-[rgb(var(--ds-error))] text-[10px] font-semibold inline-flex items-center gap-1 ring-1 ring-[rgba(var(--ds-error),0.3)] hover:bg-[rgba(var(--ds-error),0.18)]"><XCircle size={14}/> Reset</button>
          )}
          <button disabled={!status || loading} onClick={apply} className="relative h-9 px-4 rounded-lg bg-[rgb(var(--ds-primary))] text-white text-[11px] font-semibold inline-flex items-center gap-1 shadow-sm hover:brightness-110 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[rgba(var(--ds-primary),0.5)]">
            {loading && <Loader2 size={14} className="animate-spin"/>}
            {loading? 'Applying...' : 'Apply'}
          </button>
        </div>
      </div>
      {/* Progress bar */}
      {loading && (
        <div className="absolute left-0 right-0 -bottom-1 h-1 overflow-hidden rounded-b-xl">
          <div className="h-full w-full bg-linear-to-r from-[rgb(var(--ds-primary))] via-[rgb(var(--ds-secondary))] to-[rgb(var(--ds-primary))] animate-[progressSlide_1.2s_linear_infinite]" />
        </div>
      )}
      <style>{`@keyframes progressSlide{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
    </div>
  );
}
