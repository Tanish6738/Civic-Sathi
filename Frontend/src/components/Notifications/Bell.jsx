import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatNotification } from '../../services/notification.services';

export default function Bell(){
  const { items, unread, markRead, loadMore, hasMore, loading } = useNotifications();
  const [open,setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(()=>{
    function onDoc(e){ if (open && ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    return ()=> document.removeEventListener('mousedown', onDoc);
  },[open]);
  const visible = items.slice(0,25);
  return (
    <div className="relative" ref={ref}>
      <button onClick={()=> setOpen(o=>!o)} className="relative h-9 w-9 rounded-md border border-default bg-surface flex items-center justify-center text-soft hover:text-primary hover:bg-primary/10 transition-colors" aria-label="Notifications">
        <span className="text-lg">🔔</span>
        {unread > 0 && <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-semibold px-1.5 py-[1px] rounded-full shadow">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[420px] overflow-auto bg-surface rounded-lg shadow-lg border border-default z-50 p-2 flex flex-col gap-1">
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm">Notifications</span>
            <button onClick={()=> markRead(visible.filter(n=>!n.readAt).map(n=> n._id))} className="text-xs text-blue-600 hover:underline">Mark visible read</button>
          </div>
          {visible.length === 0 && <div className="text-xs text-soft py-6 text-center">No notifications</div>}
          {visible.map(n => (
            <div key={n._id} onClick={()=> markRead([n._id])} className={`p-2 rounded cursor-pointer border transition-colors text-xs flex flex-col gap-0.5 ${!n.readAt ? 'bg-primary/10 border-primary/30 hover:bg-primary/20' : 'bg-surface-80 border-transparent hover:bg-default/40'}`}> 
              <div className="font-medium leading-snug">{formatNotification(n)}</div>
              <div className="text-[10px] text-soft">{new Date(n.createdAt).toLocaleString()}</div>
            </div>
          ))}
          {hasMore && <button disabled={loading} onClick={loadMore} className="mt-1 text-xs w-full py-1 rounded bg-default/40 hover:bg-default/60 disabled:opacity-50">{loading? 'Loading...' : 'Load more'}</button>}
        </div>
      )}
    </div>
  );
}
