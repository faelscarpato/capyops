import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import '../tokens/tokens-v3.css';
import RightPanelV3 from './RightPanelV3';
import SidebarV3 from './SidebarV3';
import TopbarV3 from './TopbarV3';
import { PRIMARY_NAV_ITEMS } from '../../../ui/navConfig';
import { ThemeProviderV3, useThemeV3 } from '../theme/ThemeProviderV3';

function AppShellV3Content() {
  const { resolvedTheme } = useThemeV3();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(false);

  return (
    <div className="theme-v3 h-screen bg-[var(--bg)] text-[var(--text)]" data-theme={resolvedTheme}>
      <div className="flex h-full">
        <SidebarV3 open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopbarV3 onOpenSidebar={() => setSidebarOpen(true)} onOpenTasks={() => setTasksOpen(true)} />
          <div className="flex min-h-0 flex-1">
            <main className="min-w-0 flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">
              <div className="mx-auto w-full max-w-[1360px]">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--surface)] px-2 py-2 shadow-[var(--shadow-md)] md:hidden safe-bottom">
        <ul className="grid grid-cols-5 gap-1">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={`dock-${item.to}`}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      'flex flex-col items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-[10px] font-medium transition',
                      isActive
                        ? 'bg-[var(--surface-3)] text-[var(--primary)]'
                        : 'text-[var(--muted)] hover:bg-[var(--surface-2)]'
                    ].join(' ')
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span className="leading-none">{(item as any).mobileLabel ?? item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {tasksOpen ? <RightPanelV3 open={tasksOpen} onClose={() => setTasksOpen(false)} variant="overlay" /> : null}
    </div>
  );
}

export default function AppShellV3() {
  return (
    <ThemeProviderV3>
      <AppShellV3Content />
    </ThemeProviderV3>
  );
}
