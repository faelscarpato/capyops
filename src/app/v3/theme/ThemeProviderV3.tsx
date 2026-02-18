import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useTheme } from './useTheme';
import type { ThemeMode } from './theme';

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeV3Context = createContext<ThemeContextValue | null>(null);

export function ThemeProviderV3({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return <ThemeV3Context.Provider value={theme}>{children}</ThemeV3Context.Provider>;
}

export function useThemeV3() {
  const ctx = useContext(ThemeV3Context);
  if (!ctx) throw new Error('useThemeV3 must be used within ThemeProviderV3');
  return ctx;
}
