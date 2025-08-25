import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { fetchNotifications, fetchUnreadCount, markNotificationsRead, markAllNotificationsRead } from '../services/notification.services';
import { setClerkId } from '../utils/axios';

const NotificationCtx = createContext({});
export function useNotifications(){ return useContext(NotificationCtx); }

export function NotificationProvider({ children, pollingMs = 30000 }) {
  const [items,setItems] = useState([]);
  const [cursor,setCursor] = useState(null);
  const [unread,setUnread] = useState(0);
  const [loading,setLoading] = useState(false);
  const [hasMore,setHasMore] = useState(true);

  const { isLoaded, isSignedIn, user } = useUser();

  const load = useCallback(async (initial=false)=>{
    if (!isLoaded || !isSignedIn || !user) return; // not ready
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetchNotifications({ limit: 20, after: initial ? null : cursor });
      const newItems = res.items || [];
      setItems(prev => initial ? newItems : [...prev, ...newItems]);
      setCursor(res.nextCursor);
      setHasMore(!!res.nextCursor);
    } catch(e){
      // swallow 401 until user sync completes
      if (process.env.NODE_ENV === 'development') {
        if (e?.response?.status !== 401) console.warn('[Notifications] load failed', e?.message);
      }
    } finally { setLoading(false); }
  },[cursor,loading,isLoaded,isSignedIn,user]);

  const refreshUnread = useCallback(async ()=>{
    if (!isLoaded || !isSignedIn || !user) return;
    try { setUnread(await fetchUnreadCount()); } catch(e){ /* ignore 401 pre-sync */ }
  },[isLoaded,isSignedIn,user]);

  const markRead = useCallback(async (ids)=>{
    ids = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (!ids.length) return;
    await markNotificationsRead(ids);
    setItems(prev => prev.map(n => ids.includes(n._id) ? { ...n, readAt: new Date().toISOString() } : n));
    setUnread(u => Math.max(0, u - ids.length));
  },[]);

  const markAll = useCallback(async ()=>{
    try { await markAllNotificationsRead(); await refreshUnread(); setItems(prev => prev.map(n => n.readAt ? n : { ...n, readAt: new Date().toISOString() })); } catch(_){}
  },[refreshUnread]);

  // Set header & initial fetch when user becomes available
  useEffect(()=>{
    if (isLoaded && isSignedIn && user) {
      setClerkId(user.id);
      load(true);
      refreshUnread();
    } else if (isLoaded && !isSignedIn) {
      // Signed out -> clear state
      setItems([]); setUnread(0); setCursor(null); setHasMore(true);
    }
  }, [isLoaded, isSignedIn, user, load, refreshUnread]);

  useEffect(()=>{ const t = setInterval(()=> { refreshUnread(); }, pollingMs); return ()=> clearInterval(t); }, [refreshUnread, pollingMs]);

  const value = { items, unread, loadMore: ()=>load(false), markRead, markAll, hasMore, loading };
  return <NotificationCtx.Provider value={value}>{children}</NotificationCtx.Provider>;
}
