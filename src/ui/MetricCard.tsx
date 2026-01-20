type MetricCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
};

export default function MetricCard({ title, value, subtitle, icon }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gradient-to-b from-blue-50 via-white to-white p-4 shadow-soft dark:border-slate-800 dark:from-cyan-400/15 dark:via-slate-900 dark:to-slate-900">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
          {icon ? <span className="text-blue-600 dark:text-cyan-300">{icon}</span> : null}
          <span className="font-medium uppercase tracking-wide">{title}</span>
        </div>
        <div className="text-3xl font-semibold text-gray-900 dark:text-slate-100">{value}</div>
        {subtitle ? <div className="text-xs text-gray-500 dark:text-slate-400">{subtitle}</div> : null}
      </div>
    </div>
  );
}
