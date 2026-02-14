import type { ReactNode } from 'react';

type Props = {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  trend?: {
    value: ReactNode;
    tone?: 'neutral' | 'positive' | 'negative';
  };
  onClick?: () => void;
  hrefLabel?: string;
};

export default function KpiCard({ title, value, subtitle, icon, trend, onClick, hrefLabel }: Props) {
  const trendTone = trend?.tone ?? 'neutral';
  const trendClass =
    trendTone === 'positive'
      ? 'text-[color:var(--success)]'
      : trendTone === 'negative'
        ? 'text-[color:var(--danger)]'
        : 'text-[color:var(--muted)]';

  const clickable = typeof onClick === 'function';

  const Wrapper: any = clickable ? 'button' : 'div';

  return (
    <Wrapper
      type={clickable ? 'button' : undefined}
      onClick={onClick}
      className={[
        'w-full rounded-xl border border-default bg-surface p-4 text-left shadow-card transition',
        clickable ? 'hover:border-strong hover:bg-surface-2' : '',
        clickable ? 'focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]/30' : ''
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-2">
            {title}
          </div>
          <div className="mt-2 truncate text-2xl font-semibold text-fg">{value}</div>
          {subtitle ? <div className="mt-1 text-xs text-muted">{subtitle}</div> : null}
        </div>

        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-default bg-surface-2 text-[color:var(--primary)]">
            {icon}
          </div>
        ) : null}
      </div>

      {trend ? (
        <div className={['mt-3 text-xs font-medium', trendClass].join(' ')}>{trend.value}</div>
      ) : hrefLabel ? (
        <div className="mt-3 text-xs font-medium text-[color:var(--primary)]">{hrefLabel}</div>
      ) : null}
    </Wrapper>
  );
}
