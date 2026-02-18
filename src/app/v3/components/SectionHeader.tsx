import type { ReactNode } from 'react';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export default function SectionHeader({ title, subtitle, actions }: SectionHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="w-full sm:w-auto">{actions}</div> : null}
    </div>
  );
}
