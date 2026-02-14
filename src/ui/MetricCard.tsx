type MetricCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
};

export default function MetricCard({ title, value, subtitle, icon }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-default bg-surface p-4 shadow-card">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted">
          {icon ? <span className="text-[color:var(--primary)]">{icon}</span> : null}
          <span className="font-semibold uppercase tracking-wide">{title}</span>
        </div>
        <div className="text-3xl font-semibold text-fg">{value}</div>
        {subtitle ? <div className="text-xs text-muted">{subtitle}</div> : null}
      </div>
    </div>
  );
}
