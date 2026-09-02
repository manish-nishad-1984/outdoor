import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'theme-preference';

function systemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(pref) {
  const effective = pref === 'system' ? systemTheme() : pref;
  document.documentElement.setAttribute('data-theme', effective);
  return effective;
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => localStorage.getItem(STORAGE_KEY) || 'system');
  const [effective, setEffective] = useState(() => applyTheme(preference));

  useEffect(() => {
    setEffective(applyTheme(preference));
    try { localStorage.setItem(STORAGE_KEY, preference); } catch (e) {}
  }, [preference]);

  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setEffective(applyTheme('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const cycleTheme = useCallback(() => {
    setPreference(p => (p === 'light' ? 'dark' : p === 'dark' ? 'system' : 'light'));
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, effective, setPreference, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
