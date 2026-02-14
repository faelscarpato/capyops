import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BarChart3, DollarSign, Package, Truck, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  createTodayTask,
  ensureTodayTasks,
  getTodayTasks,
  listProducts,
  listMeliOrders,
  listMeliShipments,
  getPendingMlQuestionsCount,
  setTaskDone
} from '../lib/db';
import { readCompanySettings } from '../lib/companySettings';
import { queryKeys } from '../lib/queryKeys';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import KpiCard from '../ui/KpiCard';
import { Button } from '../ui/primitives/Button';
import TodayTasksPanel from '../components/tasks/TodayTasksPanel';

const DEFAULT_TASKS = [
  'Ver pedidos pagos',
  'Separar produtos',
  'Embalar',
  'Postar pedidos',
  'Enviar msg automática',
  'Atualizar estoque'
];

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function isPaidOrder(order: any): boolean {
  if (!order) return false;
  if (order.status === 'paid') return true;
  if (Array.isArray(order.payments)) {
    return order.payments.some((p: any) => p?.status === 'approved' || p?.status === 'paid');
  }
  return false;
}

function getOrderDate(order: any): number | null {
  const raw = order?.date_created || order?.date_closed || order?.date_last_updated;
  if (!raw) return null;
  const ts = new Date(raw).getTime();
  return Number.isFinite(ts) ? ts : null;
}

async function fetchDashboardData() {
  await ensureTodayTasks(DEFAULT_TASKS);
  const [tasks, products, mlOrders, mlShipments, pendingQuestions] = await Promise.all([
    getTodayTasks(),
    listProducts(),
    listMeliOrders(200),
    listMeliShipments(50),
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

export default function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const companySettings = readCompanySettings();

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

  const toggleTaskMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => setTaskDone(id, done),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskName: string) => createTodayTask(taskName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
  });

  const lowStock = useMemo(() => {
    return products
      .filter((p: any) => (p.stock ?? 0) <= (p.min_stock ?? 1))
      .sort((a: any, b: any) => (a.stock ?? 0) - (b.stock ?? 0));
  }, [products]);

  const lowStockCritical = lowStock.filter((p: any) => (p.stock ?? 0) <= 0);
  const lowStockWarning = lowStock.filter((p: any) => (p.stock ?? 0) > 0);

  const tasksDone = useMemo(() => tasks.filter(t => t.done).length, [tasks]);
  const tasksTotal = useMemo(() => tasks.length, [tasks]);
  const tasksPending = useMemo(() => tasks.filter(t => !t.done), [tasks]);

  const mlSummary = useMemo(() => {
    const now = Date.now();
    const startDay = new Date();
    startDay.setHours(0, 0, 0, 0);
    const dayStart = startDay.getTime();
    const last30 = now - 30 * 24 * 60 * 60 * 1000;

    let ordersToday = 0;
    let paidToday = 0;
    let revenueToday = 0;
    let orders30 = 0;
    let paid30 = 0;
    let revenue30 = 0;

    for (const row of mlOrders) {
      const order = row?.payload || row;
      const ts = getOrderDate(order);
      if (!ts) continue;
      const paid = isPaidOrder(order);
      const total = Number(order?.total_amount ?? 0);

      if (ts >= dayStart) {
        ordersToday += 1;
        if (paid) {
          paidToday += 1;
          revenueToday += total;
        }
      }
      if (ts >= last30) {
        orders30 += 1;
        if (paid) {
          paid30 += 1;
          revenue30 += total;
        }
      }
    }

    const paidRate30 = orders30 > 0 ? Math.round((paid30 / orders30) * 100) : 0;
    return {
      ordersToday,
      paidToday,
      revenueToday,
      orders30,
      paid30,
      revenue30,
      paidRate30
    };
  }, [mlOrders]);

  const nextPostDeadline = useMemo(() => {
    const deadlines = mlShipments
      .map((s) => {
        const p = s?.payload || {};
        const date =
          p?.shipping_option?.estimated_handling_limit?.date ??
          p?.estimated_handling_limit?.date ??
          p?.date_created ??
          null;
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

  const okPercent = Math.max(0, mlSummary.paidRate30);
  const okPercentRounded = Math.round(okPercent);
  const dayRevenuePct = mlSummary.revenue30 ? Math.min(100, Math.round((mlSummary.revenueToday / mlSummary.revenue30) * 100)) : 0;
  const dayOrdersPct = mlSummary.orders30 ? Math.min(100, Math.round((mlSummary.ordersToday / mlSummary.orders30) * 100)) : 0;
  const monthPaidPct = mlSummary.orders30 ? Math.min(100, Math.round((mlSummary.paid30 / mlSummary.orders30) * 100)) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Abra aqui todo dia e siga a operacao sem falha."
        actions={
          <Button variant="primary" size="sm" type="button" onClick={() => dashboardQuery.refetch()} loading={dashboardQuery.isFetching}>
            {dashboardQuery.isFetching ? 'Atualizando...' : 'Atualizar'}
          </Button>
        }
      />

      {err ? (
        <div className="alert alert-error">
          {err}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Receita ML hoje"
          value={loading ? '—' : fmtBRL(mlSummary.revenueToday)}
          subtitle={
            <span className="text-xs">
              Pedidos: {mlSummary.ordersToday} • Pagos: {mlSummary.paidToday}
            </span>
          }
          icon={<DollarSign className="h-4 w-4" />}
          onClick={() => navigate('/sales-history')}
          hrefLabel="Histórico ML"
        />

        <KpiCard
          title="Pedidos hoje"
          value={loading ? '—' : String(mlSummary.ordersToday)}
          subtitle={<span className="text-xs">Pagos hoje: {mlSummary.paidToday}</span>}
          icon={<BarChart3 className="h-4 w-4" />}
          onClick={() => navigate('/sales-history')}
          hrefLabel="Ver pedidos"
        />

        <KpiCard
          title="Estoque crítico"
          value={loading ? '—' : String(lowStock.length)}
          subtitle={
            <span className="text-xs">
              Sem estoque: {lowStockCritical.length} • Baixo: {lowStockWarning.length}
            </span>
          }
          icon={<Package className="h-4 w-4" />}
          onClick={() => navigate('/estoque?f=critical')}
          hrefLabel="Abrir estoque"
        />
        <KpiCard
          title="Receita ML 30d"
          value={loading ? '—' : fmtBRL(mlSummary.revenue30)}
          subtitle={
            <span className="text-xs">
              Pedidos: {mlSummary.orders30} • Pagos: {mlSummary.paid30}
            </span>
          }
          icon={<DollarSign className="h-4 w-4" />}
          onClick={() => navigate('/sales-history')}
          hrefLabel="Histórico ML"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <SectionCard title="Resumo ML (hoje vs 30d)" action="...">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-default bg-surface-2 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-2">Receita hoje</div>
                  <div className="mt-2 text-xl font-semibold text-fg">{fmtBRL(mlSummary.revenueToday)}</div>
                  <div className="mt-2 h-2 w-full rounded-full bg-[color:var(--surface-3)]">
                    <div className="h-2 rounded-full bg-[color:var(--primary)]" style={{ width: `${dayRevenuePct}%` }} />
                  </div>
                </div>
                <div className="rounded-lg border border-default bg-surface-2 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-2">Pedidos hoje</div>
                  <div className="mt-2 text-xl font-semibold text-fg">{mlSummary.ordersToday}</div>
                  <div className="mt-2 h-2 w-full rounded-full bg-[color:var(--surface-3)]">
                    <div className="h-2 rounded-full bg-[color:var(--warning)]" style={{ width: `${dayOrdersPct}%` }} />
                  </div>
                </div>
                <div className="rounded-lg border border-default bg-surface-2 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-2">Pagos 30d</div>
                  <div className="mt-2 text-xl font-semibold text-fg">{mlSummary.paid30}</div>
                  <div className="mt-2 h-2 w-full rounded-full bg-[color:var(--surface-3)]">
                    <div className="h-2 rounded-full bg-[color:var(--success)]" style={{ width: `${monthPaidPct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Produtos recentes" action="...">
            <div className="table-scroll">
              <table className="table-base w-full text-sm">
                <thead>
                  <tr>
                    <th className="pb-3">Produto</th>
                    <th className="pb-3">Codigo</th>
                    <th className="pb-3">Estoque</th>
                    <th className="pb-3">Minimo</th>
                  </tr>
                </thead>
                <tbody>
                  {(products.length ? products.slice(0, 5) : []).map((p: any) => (
                    <tr key={p.id}>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg border border-default bg-surface-2" />
                          <div>
                            <div className="text-sm font-semibold text-fg">{p.name ?? 'Produto'}</div>
                            <div className="text-xs text-muted">{p.variant ?? 'Padrao'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-xs text-muted">{String(p.id).slice(0, 6)}</td>
                      <td className="py-3 font-semibold text-fg">{p.stock ?? '—'}</td>
                      <td className="py-3 text-muted">{p.min_stock ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!products.length ? (
                <div className="py-6 text-center text-xs text-muted">Sem produtos cadastrados.</div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Tarefas do dia">
            <TodayTasksPanel
              loading={loading}
              tasks={tasks}
              onToggle={async (id, done) => {
                await toggleTaskMutation.mutateAsync({ id, done });
              }}
              onCreate={async (taskName) => {
                await createTaskMutation.mutateAsync(taskName);
              }}
            />
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <SectionCard title="Pagamentos ML" action="...">
            <div className="space-y-3">
              <div className="text-center text-3xl font-semibold text-fg">
                {loading ? '—' : `${okPercentRounded}%`}
              </div>
              <div className="text-center text-xs text-muted">Pagos (30d)</div>
              <div className="h-2 w-full rounded-full bg-[color:var(--surface-3)]">
                <div className="h-2 rounded-full bg-[color:var(--primary)]" style={{ width: `${okPercentRounded}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-default bg-surface-2 px-2 py-1 text-center text-muted">
                  Pagos: {mlSummary.paid30}
                </div>
                <div className="rounded-lg border border-default bg-surface-2 px-2 py-1 text-center text-muted">
                  Total: {mlSummary.orders30}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Top selling products" action="...">
            <div className="space-y-4">
              {(products.length ? products.slice(0, 3) : []).map((p: any) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl border border-default bg-surface-2" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-fg">{p.name ?? 'Produto'}</div>
                    <div className="text-xs text-muted">Estoque: {p.stock ?? '—'}</div>
                  </div>
                  <div className="text-sm font-semibold text-fg">
                    {p.price ? fmtBRL(p.price) : '—'}
                  </div>
                </div>
              ))}
              {!products.length ? (
                <div className="text-center text-xs text-muted">Sem produtos para exibir.</div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Alertas" action={<AlertTriangle className="h-4 w-4 text-muted-2" />}>
            <div className="space-y-3">
              {loading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-16 rounded-lg bg-[color:var(--surface-3)]" />
                  <div className="h-16 rounded-lg bg-[color:var(--surface-3)]" />
                </div>
              ) : lowStock.length === 0 ? (
                <div className="rounded-lg border border-[color:var(--success)] bg-[color:var(--surface-2)] p-3">
                  <div className="text-sm font-semibold text-[color:var(--success)]">
                    Nenhum estoque critico
                  </div>
                  <div className="text-xs text-muted">Tudo dentro do minimo.</div>
                </div>
              ) : (
                <>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Criticos ({lowStockCritical.length})
                  </div>
                  {lowStockCritical.slice(0, 3).map((p: any) => (
                    <div key={p.id} className="rounded-lg border border-[color:var(--danger)] bg-surface-2 p-3">
                      <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase text-[color:var(--danger)]">Critico</div>
                        <div className="text-sm font-semibold text-fg">
                          {p.name} {p.size_cm ? `${p.size_cm} cm` : ''} • {p.variant}
                        </div>
                        <div className="text-xs text-muted">
                          Estoque: <span className="font-semibold">{p.stock}</span> • Minimo:{' '}
                          <span className="font-semibold">{p.min_stock}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Atencao ({lowStockWarning.length})
                  </div>
                  {lowStockWarning.slice(0, 5).map((p: any) => (
                    <div key={p.id} className="rounded-lg border border-[color:var(--warning)] bg-surface-2 p-3">
                      <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase text-[color:var(--warning)]">Atencao</div>
                        <div className="text-sm font-semibold text-fg">
                          {p.name} {p.size_cm ? `${p.size_cm} cm` : ''} • {p.variant}
                        </div>
                        <div className="text-xs text-muted">
                          Estoque: <span className="font-semibold">{p.stock}</span> • Minimo:{' '}
                          <span className="font-semibold">{p.min_stock}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              <div className="rounded-lg border border-default bg-surface p-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Perguntas pendentes
                </div>
                <div className="mt-1 text-sm font-semibold text-fg">{pendingQuestions}</div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Resumo do dia">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="card p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Tarefas</div>
            <div className="mt-1 text-xl font-semibold text-fg">{tasksDone} de {tasksTotal}</div>
            <div className="text-sm text-muted">Pendentes: {tasksPending.length}</div>
          </div>
          <div className="card p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Estoque critico</div>
            <div className="mt-1 text-xl font-semibold text-fg">{lowStock.length}</div>
            <div className="text-sm text-muted">Sem estoque: {lowStockCritical.length}</div>
          </div>
          <div className="card p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Pedidos hoje</div>
            <div className="mt-1 text-xl font-semibold text-fg">{mlSummary.ordersToday}</div>
            <div className="text-sm text-muted">Receita: {fmtBRL(mlSummary.revenueToday)}</div>
          </div>
          <div className="card p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Prazo de postagem</div>
            <div className="mt-2 space-y-2">
              <div className="text-sm font-semibold text-fg">{nextPostDeadline ?? 'Sem prazo'}</div>
              <div className="text-[10px] text-muted-2">Baseado nos envios recentes do ML.</div>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <KpiCard
          title="Pagamentos ML (30d)"
          value={loading ? '—' : `${okPercentRounded}%`}
          subtitle={<span className="text-xs">{mlSummary.paid30} de {mlSummary.orders30} pedidos pagos</span>}
          icon={<Truck className="h-4 w-4" />}
          trend={okPercentRounded < 80 ? { value: 'ALERTA', tone: 'negative' } : { value: 'OK', tone: 'positive' }}
        />
        <KpiCard
          title="Impostos (CBS+IBS+IS)"
          value={`${effectiveTaxRate}%`}
          subtitle={<span className="text-xs">Ajuste taxas e margens padrão nas configurações.</span>}
          icon={<AlertTriangle className="h-4 w-4" />}
          trend={isHighTaxRate ? { value: 'ALTO', tone: 'negative' } : { value: 'OK', tone: 'neutral' }}
          onClick={() => navigate('/app/config?tab=preferencias')}
          hrefLabel="Configurações"
        />
      </div>

      <p className="text-xs text-muted">Nota: KPIs baseados nos pedidos Mercado Livre e status de pagamento.</p>
    </div>
  );
}
