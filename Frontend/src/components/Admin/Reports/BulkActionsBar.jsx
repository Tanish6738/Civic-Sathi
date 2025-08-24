import React, { useState } from 'react';
import { bulkUpdateReports } from '../../../services/report.services';
import { Loader2 } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';

export default function BulkActionsBar({ selectedIds = [], onDone }) {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const { notify } = useToast();
  async function apply(){
    if(!status || selectedIds.length===0) return;
    setLoading(true);
    try { await bulkUpdateReports({ ids: selectedIds, status }); onDone && onDone(status); }
    catch(e){ notify(e?.response?.data?.message || 'Bulk update failed','error'); }
    finally { setLoading(false); }
  }

  if (selectedIds.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-xs">
      <span className="font-medium text-indigo-700">{selectedIds.length} selected</span>
      <select value={status} onChange={e=>setStatus(e.target.value)} className="h-8 px-2 rounded-md border border-gray-300 bg-white text-xs">
        <option value="">Set status…</option>
        <option value="in_progress">In Progress</option>
        <option value="awaiting_verification">Await Verify</option>
        <option value="verified">Verified</option>
        <option value="closed">Closed</option>
      </select>
      <button disabled={!status || loading} onClick={apply} className="h-8 px-3 rounded-md bg-indigo-600 text-white font-medium disabled:opacity-50 flex items-center gap-1">
        {loading && <Loader2 size={14} className="animate-spin"/>}
        Apply
      </button>
    </div>
  );
}
