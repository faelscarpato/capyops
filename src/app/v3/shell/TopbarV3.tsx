import type { ReactNode } from 'react';
import { CircleHelp, ListTodo, Menu, Moon, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../lib/auth';
import AlertsPopover from '../../../ui/AlertsPopover';
import TopbarSearchCommand from '../../../ui/TopbarSearchCommand';
import { useThemeV3 } from '../theme/ThemeProviderV3';

type TopbarV3Props = {
  onOpenSidebar: () => void;
  onOpenTasks: () => void;
};

function IconButton({
  label,
  onClick,
  children
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] shadow-[var(--shadow-sm)] transition-all hover:bg-[var(--icon-hover)] hover:text-[var(--text)]"
    >
      {children}
    </button>
  );
}

export default function TopbarV3({ onOpenSidebar, onOpenTasks }: TopbarV3Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { resolvedTheme, toggle } = useThemeV3();
  const fullName = String(user?.user_metadata?.full_name ?? '').trim();
  const fallbackName = String(user?.email ?? 'Conta');
  const displayName = fullName || fallbackName;
  const avatarUrl = String(user?.user_metadata?.avatar_url ?? '').trim();
  const initials = (displayName.match(/\b\w/g)?.slice(0, 2).join('') || 'U').toUpperCase();

  return (
    <header className="flex h-[72px] items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 shadow-[var(--shadow-sm)] md:px-6">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow-sm)] transition-all hover:bg-[var(--icon-hover)] lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <TopbarSearchCommand
          fullWidth
          placeholder="Buscar..."
          className="h-11 rounded-full border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] shadow-[var(--shadow-sm)]"
        />
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <IconButton label="Theme" onClick={toggle}>
          {resolvedTheme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </IconButton>
        <IconButton label="Tasks" onClick={onOpenTasks}>
          <ListTodo className="h-4 w-4" />
        </IconButton>
        <IconButton label="Help" onClick={() => navigate('/perguntas')}>
          <CircleHelp className="h-4 w-4" />
        </IconButton>
        <AlertsPopover />
      </div>

      <button
        type="button"
        onClick={toggle}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text)] shadow-[var(--shadow-sm)] md:hidden"
      >
        {resolvedTheme === 'dark' ? <Moon className="h-4 w-4 text-[var(--primary)]" /> : <Sun className="h-4 w-4 text-[var(--primary)]" />}
        Theme
      </button>

      <div className="hidden items-center gap-3 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 shadow-[var(--shadow-sm)] sm:flex">
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-3)] text-xs font-semibold text-[var(--primary)]">
            {initials}
          </span>
        )}
        <div className="pr-1">
          <p className="text-xs font-semibold text-[var(--text)]">{displayName}</p>
          <p className="text-[11px] text-[var(--muted)]">Admin</p>
        </div>
      </div>
    </header>
  );
}
