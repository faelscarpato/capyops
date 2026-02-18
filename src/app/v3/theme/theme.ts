export type ThemeMode = 'system' | 'light' | 'dark';

export const STORAGE_KEY = 'capyops_theme';

export function getStoredTheme(): ThemeMode {
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (value === 'light' || value === 'dark' || value === 'system') return value;
  return 'system';
}

export function setStoredTheme(mode: ThemeMode) {
  window.localStorage.setItem(STORAGE_KEY, mode);
}

export function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return getSystemTheme();
  return mode;
}
