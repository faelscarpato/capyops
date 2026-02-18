import { BarChart3, Boxes, ChevronDown, LayoutDashboard, LogOut, Settings, ShoppingCart, User, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../lib/auth';
import logoCapyops from '../../../assets/logocapyops.png';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../../../ui/primitives/DropdownMenu';

type SidebarV3Props = {
  open: boolean;
  onClose: () => void;
};

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/operacoes', label: 'Operacoes', icon: ShoppingCart },
  { to: '/app/catalogo', label: 'Catalogo', icon: Boxes },
  { to: '/app/financeiro', label: 'Financeiro', icon: BarChart3 },
  { to: '/app/config', label: 'Configuracoes', icon: Settings }
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const fullName = String(user?.user_metadata?.full_name ?? '').trim();
  const fallbackName = String(user?.email ?? 'Conta');
  const displayName = fullName || fallbackName;
  const avatarUrl = String(user?.user_metadata?.avatar_url ?? '').trim();
  const initials = (displayName.match(/\b\w/g)?.slice(0, 2).join('') || 'U').toUpperCase();

  async function onSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="flex h-full flex-col bg-[var(--sidebar-bg)] text-[var(--sidebar-text)]">
      <div className="flex h-[72px] items-center justify-between border-b border-[var(--sidebar-border)] px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--sidebar-border)] bg-white/5">
            <img src={logoCapyops} alt="CapyOps" className="h-7 w-7 object-contain" />
          </div>
          <div>
            <p className="text-base font-semibold tracking-wide">CapyOps</p>
            <p className="text-xs text-[var(--sidebar-muted)]">Enterprise Console</p>
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={onClose}
            className="rounded-md p-1 text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)] lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className="p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    [
                      'flex items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm transition-colors duration-200',
                      isActive
                        ? 'border-[var(--sidebar-active-border)] bg-[var(--sidebar-active)] text-[var(--sidebar-text)]'
                        : 'border-transparent text-[var(--sidebar-muted)] hover:border-[var(--sidebar-hover-border)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]'
                    ].join(' ')
                  }
                  onClick={onClose}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto p-3">
        <div className="rounded-[var(--radius-lg)] border border-[var(--sidebar-border)] bg-[var(--sidebar-bg-2)] p-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-[var(--radius-md)] px-2 py-2 text-left transition hover:bg-[var(--sidebar-hover)]"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
                    {initials}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--sidebar-text)]">{displayName}</span>
                  <span className="block truncate text-xs text-[var(--sidebar-muted)]">Administrador</span>
                </span>
                <ChevronDown className="h-4 w-4 text-[var(--sidebar-muted)]" />
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
              <DropdownMenuSeparator className="my-1 h-px bg-surface-2" />
              <DropdownMenuItem className="text-[color:var(--danger)]" onSelect={onSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export default function SidebarV3({ open, onClose }: SidebarV3Props) {
  return (
    <>
      <aside className="hidden h-full w-[280px] border-r border-[var(--sidebar-border)] lg:block">
        <SidebarContent />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/45" aria-label="Fechar menu" onClick={onClose} />
          <aside className="relative h-full w-[280px] border-r border-[var(--sidebar-border)] shadow-[var(--shadow-lg)]">
            <SidebarContent onClose={onClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
