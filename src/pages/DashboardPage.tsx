import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, BarChart3, DollarSign, MessageCircle, Package, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ensureTodayTasks,
  getPendingMlQuestionsCount,
  getTodayTasks,
  listMeliOrders,
  listMeliShipments,
  listProducts
} from '../lib/db';
import { readCompanySettings } from '../lib/companySettings';
import { queryKeys } from '../lib/queryKeys';
import Card from '../app/v3/components/Card';
import ChartCard from '../app/v3/components/ChartCard';
import SectionHeader from '../app/v3/components/SectionHeader';
import StatCard from '../app/v3/components/StatCard';

const DEFAULT_TASKS = [
  'Ver pedidos pagos',
  'Separar produtos',
  'Embalar',
  'Postar pedidos',
  'Enviar msg automática',
  'Atualizar estoque'
];

const PERIOD_OPTIONS = [7, 14, 30] as const;
type PeriodOption = (typeof PERIOD_OPTIONS)[number];
type PaymentFilter = 'all' | 'paid' | 'pending';

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getOrderDate(order: any): number | null {
  const raw = order?.date_created || order?.date_closed || order?.date_last_updated;
  if (!raw) return null;
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) ? ts : null;
}

function getOrderTotal(order: any): number {
  return Number(order?.total_amount ?? order?.paid_amount ?? 0) || 0;
}

function getPaymentState(order: any): 'paid' | 'pending' | 'cancelled' {
  const status = String(order?.status ?? '').toLowerCase();
  if (status.includes('cancel')) return 'cancelled';
  if (status === 'paid') return 'paid';
  if (Array.isArray(order?.payments)) {
    const hasPaid = order.payments.some((p: any) => {
      const paymentStatus = String(p?.status ?? '').toLowerCase();
      return paymentStatus === 'approved' || paymentStatus === 'paid';
    });
    if (hasPaid) return 'paid';
  }
  return 'pending';
}

function formatDayLabel(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

async function fetchDashboardData() {
  await ensureTodayTasks(DEFAULT_TASKS);
  const [tasks, products, mlOrders, mlShipments, pendingQuestions] = await Promise.all([
    getTodayTasks(),
    listProducts(),
    listMeliOrders(250),
    listMeliShipments(80),
    getPendingMlQuestionsCount()
  ]);

  return {
    tasks,
    products,
    mlOrders: mlOrders ?? [],
    mlShipments: mlShipments ?? [],
    pendingQuestions: pendingQuestions ?? 0
  };
}

export default function DashboardPage({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const companySettings = readCompanySettings();
  const [period, setPeriod] = useState<PeriodOption>(30);
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>('all');

  const dashboardQuery = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: fetchDashboardData
  });

  const tasks = dashboardQuery.data?.tasks ?? [];
  const products = dashboardQuery.data?.products ?? [];
  const mlOrders = dashboardQuery.data?.mlOrders ?? [];
  const mlShipments = dashboardQuery.data?.mlShipments ?? [];
  const pendingQuestions = dashboardQuery.data?.pendingQuestions ?? 0;
  const loading = dashboardQuery.isPending;
  const err = dashboardQuery.error instanceof Error ? dashboardQuery.error.message : null;

  const normalizedOrders = useMemo(() => {
    return mlOrders
      .map((row: any) => row?.payload || row)
      .map((order: any) => {
        const ts = getOrderDate(order);
        const payment = getPaymentState(order);
        return {
          ts,
          payment,
          amount: getOrderTotal(order)
        };
      })
      .filter((o) => o.ts != null && o.payment !== 'cancelled') as Array<{
      ts: number;
      payment: 'paid' | 'pending';
      amount: number;
    }>;
  }, [mlOrders]);

  const periodStart = useMemo(() => Date.now() - period * 24 * 60 * 60 * 1000, [period]);
  const todayStart = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.getTime();
  }, []);

  const filteredOrders = useMemo(() => {
    return normalizedOrders.filter((o) => {
      if (o.ts < periodStart) return false;
      if (paymentFilter === 'all') return true;
      return o.payment === paymentFilter;
    });
  }, [normalizedOrders, periodStart, paymentFilter]);

  const allOrdersInPeriod = useMemo(() => normalizedOrders.filter((o) => o.ts >= periodStart), [normalizedOrders, periodStart]);

  const kpis = useMemo(() => {
    const paid = allOrdersInPeriod.filter((o) => o.payment === 'paid');
    const pending = allOrdersInPeriod.filter((o) => o.payment === 'pending');
    const todayOrders = normalizedOrders.filter((o) => o.ts >= todayStart);
    const todayRevenue = todayOrders.reduce((acc, o) => acc + o.amount, 0);
    const paidRevenue = paid.reduce((acc, o) => acc + o.amount, 0);
    const grossRevenue = allOrdersInPeriod.reduce((acc, o) => acc + o.amount, 0);
    const approvalRate = allOrdersInPeriod.length ? Math.round((paid.length / allOrdersInPeriod.length) * 100) : 0;

    return {
      todayRevenue,
      todayOrders: todayOrders.length,
      paidRevenue,
      grossRevenue,
      paidOrders: paid.length,
      pendingOrders: pending.length,
      totalOrders: allOrdersInPeriod.length,
      approvalRate
    };
  }, [allOrdersInPeriod, normalizedOrders, todayStart]);

  const revenueTrendData = useMemo(() => {
    const dayMap = new Map<string, { name: string; paidRevenue: number; grossRevenue: number; paidOrders: number; pendingOrders: number }>();

    for (let i = period - 1; i >= 0; i -= 1) {
      const ts = Date.now() - i * 24 * 60 * 60 * 1000;
      const key = new Date(ts).toISOString().slice(0, 10);
      dayMap.set(key, { name: formatDayLabel(ts), paidRevenue: 0, grossRevenue: 0, paidOrders: 0, pendingOrders: 0 });
    }

    for (const o of normalizedOrders) {
      if (o.ts < periodStart) continue;
      const key = new Date(o.ts).toISOString().slice(0, 10);
      const row = dayMap.get(key);
      if (!row) continue;
      row.grossRevenue += o.amount;
      if (o.payment === 'paid') {
        row.paidRevenue += o.amount;
        row.paidOrders += 1;
      } else {
        row.pendingOrders += 1;
      }
    }

    return Array.from(dayMap.values());
  }, [normalizedOrders, period, periodStart]);

  const salesBarData = useMemo(() => {
    if (paymentFilter === 'paid') {
      return revenueTrendData.slice(-7).map((d) => ({ name: d.name, value: d.paidOrders }));
    }
    if (paymentFilter === 'pending') {
      return revenueTrendData.slice(-7).map((d) => ({ name: d.name, value: d.pendingOrders }));
    }
    return revenueTrendData.slice(-7).map((d) => ({ name: d.name, value: d.paidOrders + d.pendingOrders }));
  }, [revenueTrendData, paymentFilter]);

  const lowStock = useMemo(() => {
    return products
      .filter((p: any) => (p.stock ?? 0) <= (p.min_stock ?? 1))
      .sort((a: any, b: any) => (a.stock ?? 0) - (b.stock ?? 0));
  }, [products]);

  const lowStockCritical = lowStock.filter((p: any) => (p.stock ?? 0) <= 0);
  const lowStockWarning = lowStock.filter((p: any) => (p.stock ?? 0) > 0);
  const tasksDone = useMemo(() => tasks.filter((t) => t.done).length, [tasks]);
  const tasksTotal = useMemo(() => tasks.length, [tasks]);

  const nextPostDeadline = useMemo(() => {
    const deadlines = mlShipments
      .map((s) => {
        const p = s?.payload || {};
        const date = p?.shipping_option?.estimated_handling_limit?.date ?? p?.estimated_handling_limit?.date ?? p?.date_created ?? null;
        if (!date) return null;
        const ts = new Date(date).getTime();
        return Number.isFinite(ts) ? ts : null;
      })
      .filter((v: number | null) => v != null) as number[];

    if (!deadlines.length) return null;
    deadlines.sort((a, b) => a - b);
    return new Date(deadlines[0]).toLocaleString('pt-BR');
  }, [mlShipments]);

  const effectiveTaxRateValue = useMemo(
    () => companySettings.tax_cbs + companySettings.tax_ibs + companySettings.tax_is,
    [companySettings.tax_cbs, companySettings.tax_ibs, companySettings.tax_is]
  );
  const effectiveTaxRate = useMemo(() => effectiveTaxRateValue.toFixed(2), [effectiveTaxRateValue]);
  const isHighTaxRate = effectiveTaxRateValue >= 20;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Dashboard"
        subtitle={compact ? 'Resumo financeiro com filtros de pagamento.' : 'KPIs e gráficos com filtros reais por pagamento.'}
      />

      {err ? (
        <Card className="border-[var(--danger)]">
          <p className="text-sm font-semibold text-[var(--danger)]">{err}</p>
        </Card>
      ) : null}

      <div className="grid grid-cols-12 gap-4 lg:gap-5">
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Receita do dia" value={loading ? '—' : fmtBRL(kpis.todayRevenue)} delta={8.2} progress={kpis.grossRevenue > 0 ? Math.min(100, Math.round((kpis.todayRevenue / kpis.grossRevenue) * 100)) : 0} icon={<DollarSign className="h-4 w-4" />} />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Pedidos do dia" value={loading ? '—' : String(kpis.todayOrders)} delta={3.4} progress={kpis.totalOrders ? Math.round((kpis.todayOrders / kpis.totalOrders) * 100) : 0} icon={<BarChart3 className="h-4 w-4" />} />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Taxa de pagamento" value={loading ? '—' : `${kpis.approvalRate}%`} delta={1.1} progress={kpis.approvalRate} icon={<Truck className="h-4 w-4" />} />
        </div>
        <div className="col-span-12 sm:col-span-6 xl:col-span-3">
          <StatCard label="Pendentes de pagamento" value={loading ? '—' : String(kpis.pendingOrders)} delta={-2.1} progress={kpis.totalOrders ? Math.round((kpis.pendingOrders / kpis.totalOrders) * 100) : 0} icon={<Package className="h-4 w-4" />} />
        </div>

        <div className={compact ? 'col-span-12' : 'col-span-12 xl:col-span-8'}>
          <ChartCard
            title="Revenue Overview"
            subtitle={`Período ${period}d • filtro: ${paymentFilter === 'all' ? 'todos' : paymentFilter === 'paid' ? 'pagos' : 'pendentes'}`}
            tabs={
              <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:overflow-visible sm:pb-0">
                <div className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1">
                  {PERIOD_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPeriod(option)}
                      className={['rounded-full px-3 py-1 text-xs font-semibold', period === option ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted)]'].join(' ')}
                    >
                      {option}d
                    </button>
                  ))}
                </div>
                <div className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-2)] p-1">
                  {(['all', 'paid', 'pending'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setPaymentFilter(option)}
                      className={['rounded-full px-3 py-1 text-xs font-semibold capitalize', paymentFilter === option ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted)]'].join(' ')}
                    >
                      {option === 'all' ? 'Todos' : option === 'paid' ? 'Pagos' : 'Pendentes'}
                    </button>
                  ))}
                </div>
              </div>
            }
            footer={
              <>
                <div className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs">Receita bruta: <strong>{fmtBRL(kpis.grossRevenue)}</strong></div>
                <div className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs">Receita paga: <strong>{fmtBRL(kpis.paidRevenue)}</strong></div>
                <div className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-xs">Pedidos filtrados: <strong>{filteredOrders.length}</strong></div>
              </>
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrendData}>
                <defs>
                  <linearGradient id="paidRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="grossRevenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--muted-2)" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="var(--muted-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeOpacity={0.35} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted-2)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted-2)' }} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(value: number) => fmtBRL(Number(value))}
                  contentStyle={{
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    boxShadow: 'var(--shadow-sm)',
                    background: 'var(--surface)'
                  }}
                  labelStyle={{ color: 'var(--muted)' }}
                />
                {paymentFilter !== 'pending' ? (
                  <Area
                    type="monotone"
                    dataKey="paidRevenue"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#paidRevenueFill)"
                  />
                ) : null}
                {paymentFilter !== 'paid' ? (
                  <Area
                    type="monotone"
                    dataKey="grossRevenue"
                    stroke="var(--muted-2)"
                    strokeWidth={2}
                    fill="url(#grossRevenueFill)"
                  />
                ) : null}
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className={compact ? 'col-span-12' : 'col-span-12 xl:col-span-4'}>
          <Card title="Alertas" subtitle="Riscos operacionais ativos">
            <div className="space-y-3">
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Pagamento pendente</div>
                <div className="mt-1 text-sm font-semibold text-[var(--text)]">{kpis.pendingOrders} pedidos aguardando aprovação</div>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Estoque crítico</div>
                <div className="mt-1 text-sm font-semibold text-[var(--text)]">{lowStockCritical.length} sem estoque</div>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Perguntas pendentes
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--text)]">{pendingQuestions}</div>
              </div>
            </div>
          </Card>
        </div>

        <div className={compact ? 'col-span-12' : 'col-span-12 xl:col-span-6'}>
          <Card title="Sales Performance" subtitle="Últimos 7 dias">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesBarData}>
                  <CartesianGrid stroke="var(--border)" strokeOpacity={0.35} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted-2)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--muted-2)' }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      boxShadow: 'var(--shadow-sm)',
                      background: 'var(--surface)'
                    }}
                  />
                  <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className={compact ? 'col-span-12' : 'col-span-12 xl:col-span-6'}>
          <Card title="Resumo do dia" subtitle="Indicadores rápidos">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="text-xs text-[var(--muted)]">Tarefas</div>
                <div className="text-lg font-bold text-[var(--text)]">{tasksDone}/{tasksTotal}</div>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="text-xs text-[var(--muted)]">Impostos</div>
                <div className="text-lg font-bold text-[var(--text)]">{effectiveTaxRate}%</div>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="text-xs text-[var(--muted)]">Prazo de postagem</div>
                <div className="text-sm font-semibold text-[var(--text)]">{nextPostDeadline ?? 'Sem prazo'}</div>
              </div>
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="text-xs text-[var(--muted)]">Status tributário</div>
                <div className={['text-sm font-semibold', isHighTaxRate ? 'text-[var(--danger)]' : 'text-[var(--success)]'].join(' ')}>
                  {isHighTaxRate ? 'ALTO' : 'OK'}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {!compact ? (
        <div className="col-span-12 xl:col-span-4">
          <Card title="Ações rápidas" subtitle="Navegação do hub">
            <div className="space-y-2">
              <button type="button" onClick={() => navigate('/sales-history')} className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-left text-sm font-semibold text-[var(--text)]">
                Ver histórico de vendas
              </button>
              <button type="button" onClick={() => navigate('/estoque?f=critical')} className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-left text-sm font-semibold text-[var(--text)]">
                Abrir estoque crítico
              </button>
              <button type="button" onClick={() => navigate('/app/config?tab=preferencias')} className="w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-left text-sm font-semibold text-[var(--text)]">
                Configurações fiscais
              </button>
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--warning)]/10 px-3 py-1 text-xs font-semibold text-[var(--warning)]">
                <AlertTriangle className="h-3.5 w-3.5" />
                Monitoramento ativo
              </div>
            </div>
          </Card>
        </div>
        ) : null}

        {!compact ? (
        <div className="col-span-12 xl:col-span-8">
          <Card title="Estoque em atenção" subtitle="Produtos abaixo do mínimo">
            <div className="space-y-2">
              {(lowStock.length ? lowStock.slice(0, 5) : []).map((p: any) => (
                <div key={p.id} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] p-2.5">
                  <div className="text-sm font-semibold text-[var(--text)]">{p.name}</div>
                  <div className="text-xs text-[var(--muted)]">Estoque: {p.stock ?? 0} • Mínimo: {p.min_stock ?? 0}</div>
                </div>
              ))}
              {!lowStock.length ? <div className="text-sm text-[var(--muted)]">Sem alertas de estoque.</div> : null}
            </div>
          </Card>
        </div>
        ) : null}
      </div>
    </div>
  );
}
