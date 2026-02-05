export type SectionCardProps = {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export default function SectionCard({ title, action, children, className }: SectionCardProps) {
  return (
    <div className={`card ${className || ''}`}>
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</h3>
        {action ? <div className="text-sm text-gray-400 dark:text-slate-400">{action}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
