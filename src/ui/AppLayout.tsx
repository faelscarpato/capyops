import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, Settings, TrendingUp, User } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { listMeliShipments } from '../lib/db';
import { queryKeys } from '../lib/queryKeys';
import { useMeliAutoSync } from '../hooks/useMeliAutoSync';
import { useThemeMode } from './ThemeModeProvider';
import { SidebarWidgetProvider } from './SidebarWidgetContext';
import AlertsPopover from './AlertsPopover';
import TopbarSearchCommand from './TopbarSearchCommand';
import logoCapyops from '../assets/logocapyops.png';
import { PRIMARY_NAV_ITEMS } from './navConfig';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from './primitives/DropdownMenu';

function getNextDeadline(shipments: Awaited<ReturnType<typeof listMeliShipments>>) {
  const now = Date.now();
  const blockedStatuses = ['shipped', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'not_delivered'];
  const deadlines = shipments
    .filter((shipment) => {
      const payload = shipment.payload || {};
      const status = String(payload?.status ?? shipment.status ?? '').toLowerCase();
      return !blockedStatuses.some((value) => status.includes(value));
    })
    .map((shipment) => {
      const payload = shipment.payload || {};
      return payload?.shipping_option?.estimated_handling_limit?.date ?? payload?.estimated_handling_limit?.date ?? null;
    })
    .filter(Boolean)
    .map((value: any) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value) && value >= now)
    .sort((a, b) => a - b);

  return deadlines.length ? new Date(deadlines[0]).toISOString() : null;
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const [sidebarContent, setSidebarContent] = useState<ReactNode | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  useMeliAutoSync();

  const shipmentsQuery = useQuery({
    queryKey: queryKeys.meli.shipments(20),
    queryFn: () => listMeliShipments(20),
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000
  });

  const nextDeadline = useMemo(() => getNextDeadline(shipmentsQuery.data ?? []), [shipmentsQuery.data]);

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

  const drawerContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-default bg-surface shadow-card">
          <img src={logoCapyops} alt="CapyOps" className="h-7 w-7 rounded-lg object-contain" />
        </div>
        <div className="space-y-0.5">
          <div className="text-sm font-semibold text-fg">CapyOps</div>
          <div className="text-xs text-muted">Enterprise Base</div>
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
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                    selected
                      ? 'border border-default bg-surface-2 text-[color:var(--primary)]'
                      : 'text-muted hover:bg-surface-2'
                  ].join(' ')}
                  onClick={() => setMobileOpen(false)}
                >
                  <span
                    className={[
                      'flex h-9 w-9 items-center justify-center rounded-lg',
                      selected
                        ? 'bg-surface text-[color:var(--primary)]'
                        : 'border border-default bg-surface text-muted'
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
          <div className="rounded-xl border border-default bg-surface p-3 shadow-card">
            {sidebarContent}
          </div>
        </div>
      ) : null}

      <div className="mt-auto px-4 pb-4">
        <div className="rounded-xl border border-default bg-surface p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-[color:var(--primary)]">
              {(user?.email ?? 'U').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-fg">{user?.email ?? 'Conta gratuita'}</div>
              <div className="text-xs text-muted">Plano Base</div>
            </div>
            <button type="button" onClick={onSignOut} className="ml-auto text-muted hover:text-fg" aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <NavLink
            to="/app/config?tab=preferencias"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-default bg-surface-2 px-3 py-2 text-xs font-medium text-fg hover:bg-surface"
          >
            <TrendingUp className="h-3.5 w-3.5 text-[color:var(--primary)]" />
            Plano e configurações
          </NavLink>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-app">
      <aside className="hidden w-64 flex-col border-r border-default bg-surface md:flex no-print">
        {drawerContent}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-default bg-surface px-4 no-print">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-default p-2 text-fg hover:bg-surface-2 md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="min-w-0 flex-1">
            <TopbarSearchCommand />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 text-xs text-muted sm:flex">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--success)' }} />
              <span>{user?.email ?? 'Sessão ativa'}</span>
            </div>

            <AlertsPopover />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-default bg-surface px-2.5 text-sm text-fg shadow-card hover:bg-surface-2"
                  aria-label="Abrir menu do usuário"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold text-[color:var(--primary)]">
                    {(user?.email ?? 'U').slice(0, 1).toUpperCase()}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted">Conta</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => navigate('/app/config?tab=preferencias')}>
                  <User className="mr-2 h-4 w-4 text-muted" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/app/config?tab=preferencias')}>
                  <Settings className="mr-2 h-4 w-4 text-muted" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={toggleMode}>
                  Tema: {mode === 'dark' ? 'Escuro' : 'Claro'}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 h-px bg-surface-2" />
                <DropdownMenuItem className="text-[color:var(--danger)]" onSelect={onSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <SidebarWidgetProvider setSidebarContent={setSidebarContent}>
          <main className="min-w-0 flex-1 overflow-x-hidden px-4 pb-24 pt-6 md:px-6 md:pb-6">
            <div className="mx-auto w-full max-w-5xl min-w-0">
              <Outlet />
            </div>
          </main>
        </SidebarWidgetProvider>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-default bg-surface px-2 py-2 shadow-card md:hidden no-print safe-bottom">
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
                    'flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium transition',
                    selected
                      ? 'bg-surface-2 text-[color:var(--primary)]'
                      : 'text-muted hover:bg-surface-2'
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
          <aside className="relative z-50 flex h-full w-64 max-w-[80%] flex-col overflow-y-auto border-r border-default bg-surface shadow-card">
            {drawerContent}
          </aside>
        </div>
      ) : null}

      {nextDeadline ? (
        <div className="fixed right-4 top-20 z-50 rounded-lg border border-[color:var(--warning)] bg-surface px-4 py-3 text-xs font-semibold text-[color:var(--warning)] shadow-card">
          Postar até: {new Date(nextDeadline).toLocaleString('pt-BR')}
        </div>
      ) : null}
    </div>
  );
}
