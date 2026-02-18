import { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Activity, DollarSign, Package, Users } from 'lucide-react';
import Card from '../components/Card';
import ChartCard from '../components/ChartCard';
import SectionHeader from '../components/SectionHeader';
import StatCard from '../components/StatCard';

const periodTabs = ['7d', '14d', '30d'] as const;
type PeriodTab = (typeof periodTabs)[number];

const revenueDataByTab: Record<PeriodTab, Array<{ day: string; revenue: number; forecast: number }>> = {
  '7d': [
    { day: 'Mon', revenue: 12, forecast: 11 },
    { day: 'Tue', revenue: 15, forecast: 13 },
    { day: 'Wed', revenue: 18, forecast: 16 },
    { day: 'Thu', revenue: 17, forecast: 17 },
    { day: 'Fri', revenue: 21, forecast: 19 },
    { day: 'Sat', revenue: 25, forecast: 23 },
    { day: 'Sun', revenue: 23, forecast: 22 }
  ],
  '14d': [
    { day: 'D1', revenue: 10, forecast: 9 },
    { day: 'D2', revenue: 11, forecast: 10 },
    { day: 'D3', revenue: 12, forecast: 11 },
    { day: 'D4', revenue: 12, forecast: 11 },
    { day: 'D5', revenue: 14, forecast: 13 },
    { day: 'D6', revenue: 15, forecast: 14 },
    { day: 'D7', revenue: 16, forecast: 15 },
    { day: 'D8', revenue: 17, forecast: 16 },
    { day: 'D9', revenue: 19, forecast: 17 },
    { day: 'D10', revenue: 20, forecast: 19 },
    { day: 'D11', revenue: 20, forecast: 19 },
    { day: 'D12', revenue: 22, forecast: 21 },
    { day: 'D13', revenue: 24, forecast: 22 },
    { day: 'D14', revenue: 23, forecast: 22 }
  ],
  '30d': [
    { day: 'W1', revenue: 62, forecast: 58 },
    { day: 'W2', revenue: 71, forecast: 66 },
    { day: 'W3', revenue: 75, forecast: 72 },
    { day: 'W4', revenue: 84, forecast: 80 }
  ]
};

const salesPerformanceData = [
  { name: 'North', value: 74 },
  { name: 'South', value: 58 },
  { name: 'East', value: 82 },
  { name: 'West', value: 66 },
  { name: 'Global', value: 91 }
];

const teamResolvedData = [
  { name: 'Resolved', value: 72, color: '#2563EB' },
  { name: 'Pending', value: 28, color: '#D7E0EE' }
];

const teamSlaData = [
  { name: 'On Time', value: 88, color: '#16A34A' },
  { name: 'Risk', value: 12, color: '#F59E0B' }
];

const recentActivity = [
  'Order #4921 moved to packing',
  'Inventory sync completed',
  '5 new support tickets assigned',
  'Marketing budget reached 82% of target'
];

function kpiChip(label: string, value: string) {
  return (
    <div className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs">
      <span className="text-[var(--muted)]">{label}: </span>
      <span className="font-semibold text-[var(--text)]">{value}</span>
    </div>
  );
}

export default function DashboardV3() {
  const [period, setPeriod] = useState<PeriodTab>('7d');
  const revenueData = useMemo(() => revenueDataByTab[period], [period]);

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Executive Dashboard"
        subtitle="Operational and commercial snapshot"
        actions={
          <button className="rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--primary-3)]">
            Export
          </button>
        }
      />

      <div className="grid grid-cols-12 gap-4 lg:gap-5">
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Total Revenue" value="$248.4K" delta={8.4} progress={76} icon={<DollarSign className="h-4 w-4" />} />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Active Customers" value="12,892" delta={4.1} progress={63} icon={<Users className="h-4 w-4" />} />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Orders Processed" value="3,842" delta={-1.3} progress={54} icon={<Package className="h-4 w-4" />} />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Ops Efficiency" value="91.2%" delta={2.6} progress={91} icon={<Activity className="h-4 w-4" />} />
        </div>

        <div className="col-span-12 xl:col-span-8">
          <ChartCard
            title="Revenue Overview"
            tabs={
              <div className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1">
                {periodTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setPeriod(tab)}
                    className={[
                      'rounded-full px-3 py-1 text-xs font-semibold transition',
                      period === tab
                        ? 'bg-[var(--primary)] text-white'
                        : 'text-[var(--muted)] hover:text-[var(--text)]'
                    ].join(' ')}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            }
            footer={
              <>
                {kpiChip('New Clients', '+124')}
                {kpiChip('Churn Rate', '1.9%')}
                {kpiChip('Avg. Session', '14m 22s')}
              </>
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6ECF5" />
                <XAxis dataKey="day" stroke="#8A94A6" tickLine={false} axisLine={false} />
                <YAxis stroke="#8A94A6" tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="forecast" stroke="#94A3B8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="col-span-12 xl:col-span-6">
          <Card title="Team Insights" subtitle="Resolved tickets and SLA">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={teamResolvedData} innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {teamResolvedData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-center text-xs font-medium text-[var(--muted)]">Ticket Resolution</p>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={teamSlaData} innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {teamSlaData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-center text-xs font-medium text-[var(--muted)]">SLA Compliance</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-span-12 xl:col-span-6">
          <Card title="Sales Performance" subtitle="By region">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6ECF5" />
                  <XAxis dataKey="name" stroke="#8A94A6" tickLine={false} axisLine={false} />
                  <YAxis stroke="#8A94A6" tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3B82F6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="col-span-12 xl:col-span-8">
          <Card title="Recent Activity" subtitle="Table placeholder">
            <div className="space-y-2">
              {recentActivity.map((item) => (
                <div key={item} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)]">
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="col-span-12 xl:col-span-4">
          <Card title="Logistics Status" subtitle="Current flow">
            <div className="space-y-3">
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
                <p className="font-semibold text-[var(--text)]">On-time shipments</p>
                <p className="mt-1 text-xs text-[var(--muted)]">94% within SLA</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
                <p className="font-semibold text-[var(--text)]">Delayed orders</p>
                <p className="mt-1 text-xs text-[var(--muted)]">18 orders need review</p>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm">
                <p className="font-semibold text-[var(--text)]">Carrier health</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Average score: 4.6/5</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
