import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Boxes, Calculator, LayoutDashboard, LogOut, Package, PlusCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/estoque', label: 'Estoque', icon: Package },
  { to: '/nova-venda', label: 'Nova venda', icon: PlusCircle },
  { to: '/precificador', label: 'Precificador', icon: Calculator }
];

export default function Shell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  async function onSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050505]">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 dark:border-white/10 dark:bg-[#0b0b0b]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center dark:border-white/10 dark:bg-white/5">
              <Boxes className="w-5 h-5 text-gray-700 dark:text-white/80" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">CapyOps ML</div>
              <div className="text-xs text-gray-500 dark:text-white/60">Operação diária (Normal-first)</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-600 dark:text-white/60">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span>{user?.email}</span>
            </div>
            <button onClick={onSignOut} className="btn-ghost">
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <aside className="md:sticky md:top-20 self-start">
          <nav className="card p-2">
            {navItems.map((it) => {
              const Icon = it.icon;
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={(it as any).end}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-cyan-400 dark:text-slate-950'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-white/70 dark:hover:bg-white/5'
                    ].join(' ')
                  }
                >
                  <Icon className="w-4 h-4" />
                  {it.label}
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-3 card p-3 text-xs text-gray-600 dark:text-white/60">
            <div className="font-medium text-gray-900 mb-1 dark:text-white">Atalho rápido</div>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Abra o Dashboard e siga as tarefas do dia.
            </div>
          </div>
        </aside>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
