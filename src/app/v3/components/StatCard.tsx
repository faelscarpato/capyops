import type { ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import Card from './Card';

type StatCardProps = {
  label: string;
  value: string;
  delta?: number;
  icon?: ReactNode;
  progress?: number;
};

export default function StatCard({ label, value, delta, icon, progress = 60 }: StatCardProps) {
  const positive = (delta ?? 0) >= 0;
  const pct = Math.max(0, Math.min(100, progress));

  return (
    <Card>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-2)]">{label}</p>
            <p className="mt-1 text-2xl font-bold text-[var(--text)]">{value}</p>
          </div>
          {icon ? (
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] text-[var(--primary)]">
              {icon}
            </span>
          ) : null}
        </div>

        {typeof delta === 'number' ? (
          <div className={['inline-flex items-center gap-1 text-xs font-semibold', positive ? 'text-[var(--success)]' : 'text-[var(--danger)]'].join(' ')}>
            {positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            <span>{Math.abs(delta).toFixed(1)}%</span>
          </div>
        ) : null}

        <div className="h-1.5 w-full rounded-full bg-[var(--progress-track)]">
          <div className="h-1.5 rounded-full bg-[var(--primary)]" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Card>
  );
}
