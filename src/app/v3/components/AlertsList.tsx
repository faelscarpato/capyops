import { AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';

type AlertItem = {
  id: string;
  title: string;
  description: string;
  level: 'urgent' | 'warning' | 'ok';
};

type AlertsListProps = {
  items: AlertItem[];
};

function iconFor(level: AlertItem['level']) {
  if (level === 'urgent') return <AlertTriangle className="h-4 w-4 text-[var(--danger)]" />;
  if (level === 'warning') return <Clock3 className="h-4 w-4 text-[var(--warning)]" />;
  return <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />;
}

export default function AlertsList({ items }: AlertsListProps) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5">{iconFor(item.level)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-[var(--text)]">{item.title}</p>
                {item.level === 'urgent' ? (
                  <span className="rounded-full bg-[var(--danger)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--danger)]">
                    Urgent
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">{item.description}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
