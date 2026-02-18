import type { ReactNode } from 'react';

type CardProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export default function Card({ title, subtitle, actions, children, className = '', bodyClassName = '' }: CardProps) {
  const hasHeader = title || subtitle || actions;

  return (
    <section
      className={[
        'relative overflow-hidden border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-md)] md:p-5',
        'rounded-[var(--radius-lg)]',
        className
      ].join(' ')}
    >
      {hasHeader ? (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h3 className="truncate text-sm font-semibold text-[var(--text)]">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-xs text-[var(--muted)]">{subtitle}</p> : null}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
