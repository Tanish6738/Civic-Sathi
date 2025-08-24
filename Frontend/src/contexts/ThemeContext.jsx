import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// Theme context provides current mode and toggler
const ThemeContext = createContext({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {}
});

const STORAGE_KEY = 'ui-theme-preference';

export const ThemeProvider = ({ children, defaultTheme = 'system' }) => {
  const getPreferred = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    if (defaultTheme === 'light' || defaultTheme === 'dark') return defaultTheme;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    return media.matches ? 'dark' : 'light';
  };

  const [theme, setThemeState] = useState(() => typeof window === 'undefined' ? 'light' : getPreferred());

  const applyTheme = useCallback((t) => {
    const root = document.documentElement;
    if (t === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
  }, []);

  useEffect(() => { applyTheme(theme); }, [theme, applyTheme]);

  const setTheme = useCallback((t) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, [setTheme]);

  // Keep in sync with system if user hasn't explicitly chosen (only when defaultTheme='system')
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return; // user set
    if (defaultTheme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setTheme(media.matches ? 'dark' : 'light');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [defaultTheme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
