import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { Button } from './primitives/Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from './primitives/DropdownMenu';

type TabItem = {
  id: string;
  label: string;
};

export function useTaskTabs(tabs: readonly TabItem[], defaultTab: string, paramName = 'tab') {
  const [searchParams, setSearchParams] = useSearchParams();
  const allowed = useMemo(() => new Set(tabs.map((t) => t.id)), [tabs]);
  const raw = searchParams.get(paramName) ?? '';
  const activeTab = allowed.has(raw) ? raw : defaultTab;

  function setActiveTab(next: string) {
    if (!allowed.has(next)) return;
    const params = new URLSearchParams(searchParams);
    params.set(paramName, next);
    setSearchParams(params, { replace: true });
  }

  return { activeTab, setActiveTab };
}

export function TaskTabs({
  tabs,
  activeTab,
  onChange,
  ariaLabel
}: {
  tabs: readonly TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  ariaLabel: string;
}) {
  const compactTabs = tabs.length > 6 ? tabs.slice(0, 5) : tabs;
  const overflowTabs = tabs.length > 6 ? tabs.slice(5) : [];
  const activeOverflow = overflowTabs.find((tab) => tab.id === activeTab);

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-1.5 md:p-2">
      <nav className="flex items-center gap-2" aria-label={ariaLabel}>
        <div className="flex-1 overflow-x-auto">
          <div className="flex min-w-max gap-1.5 pr-1 snap-x">
            {compactTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={[
                  'snap-start whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 ring-default',
                  activeTab === tab.id
                    ? 'border-[color:var(--primary)] bg-[color:var(--surface-2)] text-[color:var(--primary)]'
                    : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'
                ].join(' ')}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {overflowTabs.length ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant={activeOverflow ? 'secondary' : 'ghost'} size="sm" aria-label="Mais abas">
                <MoreHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">{activeOverflow ? activeOverflow.label : 'Mais'}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {overflowTabs.map((tab) => (
                <DropdownMenuItem key={tab.id} onSelect={() => onChange(tab.id)}>
                  {tab.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </nav>
    </div>
  );
}
