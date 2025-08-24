import React, { useState } from 'react';

export default function MisrouteDialog({ open, onClose, onSubmit, loading }) {
  const [reason, setReason] = useState('');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end xs:items-center justify-center bg-black/40 backdrop-blur-sm p-2 xs:p-4">
      <div className="w-full max-w-md rounded-lg bg-surface border border-default shadow-lg flex flex-col">
        <div className="p-4 border-b border-default flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide">Flag Misrouted</h2>
          <button onClick={onClose} className="text-soft hover:text-primary text-sm">✕</button>
        </div>
        <div className="p-4 flex flex-col gap-3">
          <textarea value={reason} onChange={e=> setReason(e.target.value)} placeholder="Describe why this report is misrouted..." rows={4} className="w-full resize-none text-sm rounded-md border border-default bg-surface px-2 py-2" />
          <p className="text-[11px] text-soft/60">Provide a concise reason so admins can reassign appropriately.</p>
        </div>
        <div className="px-4 pb-4 flex gap-2 justify-end">
          <button onClick={onClose} className="h-9 px-4 rounded-md border border-default text-xs font-medium bg-surface hover:bg-primary/10">Cancel</button>
          <button disabled={!reason.trim() || loading} onClick={()=> onSubmit(reason)} className="h-9 px-4 rounded-md bg-danger text-white text-xs font-medium disabled:opacity-50">{loading? 'Flagging...' : 'Flag Misrouted'}</button>
        </div>
      </div>
    </div>
  );
}
