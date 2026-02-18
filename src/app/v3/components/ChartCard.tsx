import type { ReactNode } from 'react';
import Card from './Card';

type ChartCardProps = {
  title: string;
  subtitle?: string;
  tabs?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export default function ChartCard({ title, subtitle, tabs, children, footer, className = '' }: ChartCardProps) {
  return (
    <Card title={title} subtitle={subtitle} actions={tabs} className={className}>
      <div className="space-y-4">
        <div className="h-64 w-full">{children}</div>
        {footer ? <div className="flex flex-wrap gap-2">{footer}</div> : null}
      </div>
    </Card>
  );
}
