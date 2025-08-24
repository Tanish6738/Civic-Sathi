import React, { createContext, useContext, useCallback, useState } from 'react';

const ToastCtx = createContext({ notify: () => {} });

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const notify = useCallback((msg, type='info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(ts => [...ts, { id, msg, type }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-[9999] w-72">
        {toasts.map(t => (
          <div key={t.id} className={`text-sm rounded-md px-4 py-3 shadow border flex items-start gap-2 animate-fade-in ${t.type==='error' ? 'bg-rose-600 text-white border-rose-500' : t.type==='success' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-gray-800 text-white border-gray-700'}`}>{t.msg}</div>
        ))}
      </div>
      <style>{`@keyframes fade-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}.animate-fade-in{animation:fade-in .25s ease both}`}</style>
    </ToastCtx.Provider>
  );
}

export function useToast(){ return useContext(ToastCtx); }
