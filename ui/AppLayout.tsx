import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LogOut,
  Menu,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { listMeliShipments } from '../lib/db';
import { meliProcessWorker, meliSyncOrders } from '../lib/meliApi';
import { useThemeMode } from './ThemeModeProvider';
import { SidebarWidgetProvider } from './SidebarWidgetContext';
import AlertsPopover from './AlertsPopover';
import logoCapyops from '../assets/logocapyops.png';
import { PRIMARY_NAV_ITEMS } from './navConfig';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const [sidebarContent, setSidebarContent] = useState<ReactNode | null>(null);
  const [nextDeadline, setNextDeadline] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const activeMap = useMemo(() => {
    const path = location.pathname;
    return PRIMARY_NAV_ITEMS.reduce<Record<string, boolean>>((acc, item) => {
      acc[item.to] = item.end ? path === item.to : path.startsWith(item.to);
      return acc;
    }, {});
  }, [location.pathname]);

  async function onSignOut() {
    await signOut();
    navigate('/login');
  }

  useEffect(() => {
    let active = true;

    async function refreshDeadline() {
      try {
        const rows = await listMeliShipments(20);
        const now = Date.now();
        const deadlines = rows
          .filter((r) => {
            const p = r.payload || {};
            const status = String(p?.status ?? r.status ?? '').toLowerCase();
            // Only show deadlines for shipments not yet in transit/delivered/cancelled.
            const blocked = ['shipped', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'not_delivered'];
            return !blocked.some((k) => status.includes(k));
          })
          .map((r) => {
            const p = r.payload || {};
            return p?.shipping_option?.estimated_handling_limit?.date ??
              p?.estimated_handling_limit?.date ??
              null;
          })
          .filter(Boolean)
          .map((d: any) => new Date(d).getTime())
          .filter((t) => Number.isFinite(t) && t >= now)
          .sort((a, b) => a - b);
        if (active) setNextDeadline(deadlines.length ? new Date(deadlines[0]).toISOString() : null);
      } catch {
        if (active) setNextDeadline(null);
      }
    }

    refreshDeadline();
    const t = window.setInterval(refreshDeadline, 5 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(t);
    };
  }, []);

  useEffect(() => {
    const enabled = window.localStorage.getItem('meli_auto_sync');
    if (enabled === 'false') return;
    const run = async () => {
      try {
        await meliSyncOrders();
        await meliProcessWorker();
      } catch {
        // silent
      }
    };
    run();
    const t = window.setInterval(run, 12 * 60 * 1000);
    return () => window.clearInterval(t);
  }, []);

  const drawerContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <img src={logoCapyops} alt="CapyOps" className="h-7 w-7 rounded-lg object-contain" />
        </div>
        <div className="space-y-0.5">
          <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">CapyOps</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Base</div>
        </div>
      </div>

      <nav className="px-4 pb-4">
        <ul className="space-y-1.5">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const selected = activeMap[item.to as keyof typeof activeMap];
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={(item as any).end}
                  className={[
                    'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition',
                    selected
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-cyan-400/15 dark:text-cyan-200'
                      : 'text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
                  ].join(' ')}
                  onClick={() => setMobileOpen(false)}
                >
                  <span
                    className={[
                      'flex h-9 w-9 items-center justify-center rounded-xl',
                      selected
                        ? 'bg-indigo-100 text-indigo-600 dark:bg-cyan-400/20 dark:text-cyan-200'
                        : 'bg-white text-gray-500 shadow-soft dark:bg-slate-900 dark:text-slate-400'
                    ].join(' ')}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {sidebarContent ? (
        <div className="px-4 pb-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-card dark:border-slate-800 dark:bg-slate-900">
            {sidebarContent}
          </div>
        </div>
      ) : null}

      <div className="mt-auto px-4 pb-4 space-y-4">
        <div className="rounded-2xl bg-gradient-to-b from-indigo-100 via-indigo-50 to-white p-4 text-center dark:from-cyan-500/10 dark:via-cyan-500/5 dark:to-slate-900">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-soft dark:bg-slate-900">
            <TrendingUp className="h-5 w-5 text-indigo-500 dark:text-cyan-300" />
          </div>
          <div className="text-sm font-semibold text-gray-800 dark:text-slate-100">Upgrade Now</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">Desbloqueie recursos premium</div>
          <NavLink to="/configuracoes" className="btn-primary mt-3 w-full text-xs text-center">
            Ver planos
          </NavLink>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-cyan-400/20 dark:text-cyan-200">
              {(user?.email ?? 'U').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">{user?.email ?? 'Conta gratuita'}</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">Plano Base</div>
            </div>
            <button type="button" onClick={onSignOut} className="ml-auto text-gray-400 hover:text-gray-600 dark:text-slate-400">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Tema</div>
          <button
            type="button"
            onClick={toggleMode}
            className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-soft transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <span>{mode === 'dark' ? 'Escuro' : 'Claro'}</span>
            <span
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${mode === 'dark' ? 'bg-cyan-400' : 'bg-gray-300'}`}
              aria-hidden="true"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${mode === 'dark' ? 'translate-x-4' : 'translate-x-1'}`}
              />
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex no-print">
        {drawerContent}
      </aside>

      <div className="flex flex-1 min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 no-print">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">CapyOps Dashboard</div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-xs text-gray-500 dark:text-slate-400 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{user?.email ?? 'Sessao ativa'}</span>
            </div>
            <AlertsPopover />
            <button type="button" onClick={onSignOut} className="btn-ghost hidden sm:inline-flex">
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </header>

        <SidebarWidgetProvider setSidebarContent={setSidebarContent}>
          <main className="flex-1 min-w-0 overflow-x-hidden px-4 py-6 md:px-6 pb-24 md:pb-6">
            <div className="mx-auto w-full max-w-5xl min-w-0">
              <Outlet />
            </div>
          </main>
        </SidebarWidgetProvider>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white px-2 py-2 shadow-lg dark:border-slate-800 dark:bg-slate-900 md:hidden no-print">
        <ul className="grid grid-cols-5 gap-1">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const selected = activeMap[item.to as keyof typeof activeMap];
            return (
              <li key={`bottom-${item.to}`}>
                <NavLink
                  to={item.to}
                  end={(item as any).end}
                  className={[
                    'flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition',
                    selected
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-cyan-400/15 dark:text-cyan-200'
                      : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800/70'
                  ].join(' ')}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="leading-none">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-50 flex h-full w-64 max-w-[80%] flex-col overflow-y-auto border-r border-gray-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
            {drawerContent}
          </aside>
        </div>
      ) : null}

      {nextDeadline ? (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 shadow-lg dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-100">
          Postar até: {new Date(nextDeadline).toLocaleString('pt-BR')}
        </div>
      ) : null}
    </div>
  );
}
