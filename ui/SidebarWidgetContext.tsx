import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

type SidebarWidgetCtx = {
  setSidebarContent: (content: ReactNode | null) => void;
};

const SidebarWidgetContext = createContext<SidebarWidgetCtx | undefined>(undefined);

export function SidebarWidgetProvider({
  children,
  setSidebarContent
}: {
  children: ReactNode;
  setSidebarContent: (content: ReactNode | null) => void;
}) {
  return (
    <SidebarWidgetContext.Provider value={{ setSidebarContent }}>{children}</SidebarWidgetContext.Provider>
  );
}

export function useSidebarWidget() {
  const ctx = useContext(SidebarWidgetContext);
  if (!ctx) throw new Error('useSidebarWidget must be used within SidebarWidgetProvider');
  return ctx;
}
