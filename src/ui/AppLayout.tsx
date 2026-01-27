import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Calculator,
  ClipboardCheck,
  Grid2x2,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Boxes,
  CreditCard,
  Layers,
  FileText,
  MessageCircle,
  Crosshair,
  TrendingUp,
  Settings,
  History
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useThemeMode } from './ThemeModeProvider';
import { SidebarWidgetProvider } from './SidebarWidgetContext';
import logoCapyops from '../assets/logocapyops.png';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/perguntas', label: 'Perguntas', icon: MessageCircle },
  { to: '/competidores', label: 'Competidores', icon: Crosshair },
  { to: '/estoque-preditivo', label: 'Estoque preditivo', icon: TrendingUp },
  { to: '/configuracoes', label: 'Configuracoes', icon: Settings },
  { to: '/estoque', label: 'Estoque', icon: Package },
  { to: '/insumos', label: 'Insumos', icon: Boxes },
  { to: '/despesas', label: 'Despesas', icon: CreditCard },
  { to: '/kits', label: 'Kits', icon: Layers },
  { to: '/orcamentos', label: 'Orcamentos', icon: FileText },
  { to: '/nova-venda', label: 'Nova venda', icon: ReceiptText },
  { to: '/sales-history', label: 'Historico de vendas', icon: History },
  { to: '/precificador', label: 'Precificador', icon: Calculator },
  { to: '/relatorios', label: 'Relatorios', icon: BarChart3 },
  { to: '/plano-marketing', label: 'Plano Mkt + Operacao', icon: ClipboardCheck }
];

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { mode, toggleMode } = useThemeMode();
  const [sidebarContent, setSidebarContent] = useState<ReactNode | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const activeMap = useMemo(() => {
    const path = location.pathname;
    return {
      '/': path === '/',
      '/perguntas': path.startsWith('/perguntas'),
      '/competidores': path.startsWith('/competidores'),
      '/estoque-preditivo': path.startsWith('/estoque-preditivo'),
      '/configuracoes': path.startsWith('/configuracoes'),
      '/estoque': path.startsWith('/estoque'),
      '/insumos': path.startsWith('/insumos'),
      '/despesas': path.startsWith('/despesas'),
      '/kits': path.startsWith('/kits'),
      '/orcamentos': path.startsWith('/orcamentos'),
      '/nova-venda': path.startsWith('/nova-venda'),
      '/sales-history': path.startsWith('/sales-history'),
      '/precificador': path.startsWith('/precificador'),
      '/relatorios': path.startsWith('/relatorios'),
      '/plano-marketing': path.startsWith('/plano-marketing')
    };
  }, [location.pathname]);

  async function onSignOut() {
    await signOut();
    navigate('/login');
  }

  const drawerContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-4 dark:border-slate-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
          <img src={logoCapyops} alt="CapyOps" className="h-7 w-7 rounded-lg object-contain" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">CapyOps ML</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Operacao diaria</div>
        </div>
      </div>
      <nav className="px-3 py-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const selected = activeMap[item.to as keyof typeof activeMap];
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={(item as any).end}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    selected
                      ? 'bg-blue-600 text-white shadow-soft dark:bg-cyan-400 dark:text-slate-950'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon
                    className={`h-4 w-4 ${selected ? 'text-white dark:text-slate-950' : 'text-gray-500 dark:text-slate-400'}`}
                  />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      {sidebarContent ? (
        <div className="px-4 pb-4">
          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            {sidebarContent}
          </div>
        </div>
      ) : null}
      <div className="mt-auto px-4 pb-4">
        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">Tema</div>
          <button
            type="button"
            onClick={toggleMode}
            className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-soft transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <span>{mode === 'dark' ? 'Escuro' : 'Claro'}</span>
            <span
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                mode === 'dark' ? 'bg-cyan-400' : 'bg-gray-300'
              }`}
              aria-hidden="true"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  mode === 'dark' ? 'translate-x-4' : 'translate-x-1'
                }`}
              />
            </span>
          </button>
          <span className="inline-flex w-max items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Tailwind mode
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950">
      <aside className="hidden w-60 flex-col border-r border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex no-print">
        {drawerContent}
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 no-print">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">CapyOps ML</div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-xs text-gray-500 dark:text-slate-400 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{user?.email ?? 'Sessao ativa'}</span>
            </div>
            <button type="button" onClick={onSignOut} className="btn-ghost">
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </header>

        <SidebarWidgetProvider setSidebarContent={setSidebarContent}>
          <main className="flex-1 px-4 py-6 md:px-6">
            <div className="mx-auto w-full max-w-5xl">
              <Outlet />
            </div>
          </main>
        </SidebarWidgetProvider>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-50 w-64 max-w-[80%] border-r border-gray-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
            {drawerContent}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
