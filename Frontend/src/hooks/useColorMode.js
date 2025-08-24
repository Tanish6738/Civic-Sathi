import { useEffect, useState, useCallback } from 'react';

// Simple color mode hook leveraging existing `.dark` theme class in theme.css
export function useColorMode() {
  const getInitial = () => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('color-mode') : null;
    if (stored === 'light' || stored === 'dark') return stored;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  };

  const [mode, setMode] = useState(getInitial);

  // Apply class to root element
  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    localStorage.setItem('color-mode', mode);
  }, [mode]);

  // Watch system preference changes (only if user hasn't explicitly chosen)
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const stored = localStorage.getItem('color-mode');
      if (!stored) setMode(media.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const toggle = useCallback(() => setMode(m => (m === 'dark' ? 'light' : 'dark')), []);

  return { mode, setMode, toggle };
}
