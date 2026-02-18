import { useEffect, useMemo, useState } from 'react';
import { getStoredTheme, getSystemTheme, resolveTheme, setStoredTheme, type ThemeMode } from './theme';

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredTheme());
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => getSystemTheme());

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => setSystemTheme(media.matches ? 'dark' : 'light');
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const resolvedTheme = useMemo(() => {
    if (mode === 'system') return systemTheme;
    return resolveTheme(mode);
  }, [mode, systemTheme]);

  useEffect(() => {
    document.body.classList.add('theme-v3');
    document.body.setAttribute('data-theme', resolvedTheme);
    return () => {
      document.body.classList.remove('theme-v3');
      document.body.removeAttribute('data-theme');
    };
  }, [resolvedTheme]);

  function setMode(nextMode: ThemeMode) {
    setModeState(nextMode);
    setStoredTheme(nextMode);
  }

  function toggle() {
    if (resolvedTheme === 'dark') {
      setMode('light');
      return;
    }
    setMode('dark');
  }

  return { mode, resolvedTheme, setMode, toggle };
}
