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
      ? 'text-emerald-700 dark:text-emerald-300'
      : trendTone === 'negative'
        ? 'text-red-700 dark:text-red-300'
        : 'text-gray-600 dark:text-slate-300';

  const clickable = typeof onClick === 'function';

  const Wrapper: any = clickable ? 'button' : 'div';

  return (
    <Wrapper
      type={clickable ? 'button' : undefined}
      onClick={onClick}
      className={[
        'w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-card transition',
        'dark:border-slate-800 dark:bg-slate-900',
        clickable ? 'hover:-translate-y-0.5 hover:bg-gray-50 dark:hover:bg-slate-950' : '',
        clickable ? 'focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:focus:ring-cyan-400/30' : ''
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
            {title}
          </div>
          <div className="mt-2 truncate text-2xl font-bold text-gray-900 dark:text-slate-100">{value}</div>
          {subtitle ? <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">{subtitle}</div> : null}
        </div>

        {icon ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-indigo-50 text-indigo-600 dark:border-slate-800 dark:bg-cyan-400/15 dark:text-cyan-200">
            {icon}
          </div>
        ) : null}
      </div>

      {trend ? (
        <div className={['mt-3 text-xs font-medium', trendClass].join(' ')}>{trend.value}</div>
      ) : hrefLabel ? (
        <div className="mt-3 text-xs font-medium text-blue-700 dark:text-cyan-300">{hrefLabel}</div>
      ) : null}
    </Wrapper>
  );
}
