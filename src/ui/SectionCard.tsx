export type SectionCardProps = {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export default function SectionCard({ title, action, children, className }: SectionCardProps) {
  return (
    <div className={`card ${className || ''}`}>
      <div className="flex items-center justify-between border-b border-default px-4 py-3">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        {action ? <div className="text-sm text-muted-2">{action}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
