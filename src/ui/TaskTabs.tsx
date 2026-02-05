import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

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
  return (
    <div className="card p-2">
      <nav className="flex flex-wrap gap-2" aria-label={ariaLabel}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={[
              'whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              activeTab === tab.id
                ? 'bg-indigo-50 text-indigo-700 dark:bg-cyan-400/15 dark:text-cyan-200'
                : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200'
            ].join(' ')}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
