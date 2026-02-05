import { useEffect, useMemo, useState, type CSSProperties } from 'react';
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
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import KpiCard from '../ui/KpiCard';
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

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Array<{ id: string; task_name: string; done: boolean }>>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [mlOrders, setMlOrders] = useState<any[]>([]);
  const [mlShipments, setMlShipments] = useState<any[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState(0);
  const companySettings = readCompanySettings();
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      await ensureTodayTasks(DEFAULT_TASKS);
      const [t, p, orders, shipments, questions] = await Promise.all([
        getTodayTasks(),
        listProducts(),
        listMeliOrders(200),
        listMeliShipments(50),
        getPendingMlQuestionsCount()
      ]);
      setTasks(t);
      setProducts(p);
      setMlOrders(orders ?? []);
      setMlShipments(shipments ?? []);
      setPendingQuestions(questions ?? 0);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

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

  async function toggleTask(id: string, done: boolean) {
    await setTaskDone(id, done);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done } : t)));
  }

  async function handleCreateTask(taskName: string) {
    await createTodayTask(taskName);
    const t = await getTodayTasks();
    setTasks(t);
  }

  function handleRefresh() {
    if (!loading) {
      refresh();
    }
  }

  const okPercent = Math.max(0, mlSummary.paidRate30);
  const okPercentRounded = Math.round(okPercent);
  const donutStyle: CSSProperties = {
    background: `conic-gradient(#5f5bff 0 ${okPercent}%, #ff8a65 ${okPercent}% 100%)`
  };
  const dayRevenuePct = mlSummary.revenue30 ? Math.min(100, Math.round((mlSummary.revenueToday / mlSummary.revenue30) * 100)) : 0;
  const dayOrdersPct = mlSummary.orders30 ? Math.min(100, Math.round((mlSummary.ordersToday / mlSummary.orders30) * 100)) : 0;
  const monthPaidPct = mlSummary.orders30 ? Math.min(100, Math.round((mlSummary.paid30 / mlSummary.orders30) * 100)) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Abra aqui todo dia e siga a operacao sem falha."
        actions={
          <button className="btn-primary text-xs" type="button" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
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
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-slate-950">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Receita hoje</div>
                  <div className="mt-2 text-xl font-bold text-gray-900 dark:text-slate-100">{fmtBRL(mlSummary.revenueToday)}</div>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-slate-800">
                    <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${dayRevenuePct}%` }} />
                  </div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-slate-950">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pedidos hoje</div>
                  <div className="mt-2 text-xl font-bold text-gray-900 dark:text-slate-100">{mlSummary.ordersToday}</div>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-slate-800">
                    <div className="h-2 rounded-full bg-amber-400" style={{ width: `${dayOrdersPct}%` }} />
                  </div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-slate-950">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pagos 30d</div>
                  <div className="mt-2 text-xl font-bold text-gray-900 dark:text-slate-100">{mlSummary.paid30}</div>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-slate-800">
                    <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${monthPaidPct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Produtos recentes" action="...">
            <div className="table-scroll">
              <table className="table-base w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="pb-3">Produto</th>
                    <th className="pb-3">Codigo</th>
                    <th className="pb-3">Estoque</th>
                    <th className="pb-3">Minimo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {(products.length ? products.slice(0, 5) : []).map((p: any) => (
                    <tr key={p.id} className="text-gray-700 dark:text-slate-200">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-cyan-400/15" />
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{p.name ?? 'Produto'}</div>
                            <div className="text-xs text-gray-400">{p.variant ?? 'Padrao'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-xs text-gray-400">{String(p.id).slice(0, 6)}</td>
                      <td className="py-3 font-semibold">{p.stock ?? '—'}</td>
                      <td className="py-3 text-gray-500">{p.min_stock ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!products.length ? (
                <div className="py-6 text-center text-xs text-gray-400">Sem produtos cadastrados.</div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Tarefas do dia">
            <TodayTasksPanel
              loading={loading}
              tasks={tasks}
              onToggle={toggleTask}
              onCreate={handleCreateTask}
            />
          </SectionCard>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-4">
          <SectionCard title="Pagamentos ML" action="...">
            <div className="flex flex-col items-center gap-4">
              <div className="relative flex h-40 w-40 items-center justify-center rounded-full" style={donutStyle}>
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-center text-sm font-semibold text-gray-800 shadow-soft dark:bg-slate-900 dark:text-slate-100">
                  {loading ? '—' : `${okPercentRounded}%`}
                  <br />
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Pagos (30d)</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  Pagos
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-orange-400" />
                  Outros
                </span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Top selling products" action="...">
            <div className="space-y-4">
              {(products.length ? products.slice(0, 3) : []).map((p: any) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-cyan-400/15" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{p.name ?? 'Produto'}</div>
                    <div className="text-xs text-gray-400">Estoque: {p.stock ?? '—'}</div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {p.price ? fmtBRL(p.price) : '—'}
                  </div>
                </div>
              ))}
              {!products.length ? (
                <div className="text-center text-xs text-gray-400">Sem produtos para exibir.</div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title="Alertas" action={<AlertTriangle className="h-4 w-4 text-gray-400 dark:text-slate-400" />}>
            <div className="space-y-3">
              {loading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-16 rounded-lg bg-gray-200 dark:bg-slate-800" />
                  <div className="h-16 rounded-lg bg-gray-200 dark:bg-slate-800" />
                </div>
              ) : lowStock.length === 0 ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-900/30">
                  <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                    Nenhum estoque critico
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-200">Tudo dentro do minimo.</div>
                </div>
              ) : (
                <>
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Criticos ({lowStockCritical.length})
                  </div>
                  {lowStockCritical.slice(0, 3).map((p: any) => (
                    <div
                      key={p.id}
                      className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/60 dark:bg-red-900/30"
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase text-red-700 dark:text-red-200">Critico</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {p.name} {p.size_cm ? `${p.size_cm} cm` : ''} • {p.variant}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-slate-300">
                          Estoque: <span className="font-semibold">{p.stock}</span> • Minimo:{' '}
                          <span className="font-semibold">{p.min_stock}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    Atencao ({lowStockWarning.length})
                  </div>
                  {lowStockWarning.slice(0, 5).map((p: any) => (
                    <div
                      key={p.id}
                      className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-900/30"
                    >
                      <div className="space-y-1">
                        <div className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-200">
                          Atencao
                        </div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                          {p.name} {p.size_cm ? `${p.size_cm} cm` : ''} • {p.variant}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-slate-300">
                          Estoque: <span className="font-semibold">{p.stock}</span> • Minimo:{' '}
                          <span className="font-semibold">{p.min_stock}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
              <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Perguntas pendentes
                </div>
                <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-slate-100">{pendingQuestions}</div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <SectionCard title="Resumo do dia">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="card p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Tarefas
            </div>
            <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-slate-100">
              {tasksDone} de {tasksTotal}
            </div>
            <div className="text-sm text-gray-500 dark:text-slate-400">Pendentes: {tasksPending.length}</div>
          </div>
          <div className="card p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Estoque critico
            </div>
            <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-slate-100">{lowStock.length}</div>
            <div className="text-sm text-gray-500 dark:text-slate-400">Sem estoque: {lowStockCritical.length}</div>
          </div>
          <div className="card p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Pedidos hoje
            </div>
            <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-slate-100">{mlSummary.ordersToday}</div>
            <div className="text-sm text-gray-500 dark:text-slate-400">
              Receita: {fmtBRL(mlSummary.revenueToday)}
            </div>
          </div>
          <div className="card p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Prazo de postagem
            </div>
            <div className="mt-2 space-y-2">
              <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                {nextPostDeadline ?? 'Sem prazo'}
              </div>
              <div className="text-[10px] text-gray-400 dark:text-slate-500">
                Baseado nos envios recentes do ML.
              </div>
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
          trend={
            okPercentRounded < 80
              ? { value: 'ALERTA', tone: 'negative' }
              : { value: 'OK', tone: 'positive' }
          }
        />
        <KpiCard
          title="Impostos (CBS+IBS+IS)"
          value={`${effectiveTaxRate}%`}
          subtitle={<span className="text-xs">Ajuste taxas e margens padrão nas configurações.</span>}
          icon={<AlertTriangle className="h-4 w-4" />}
          trend={isHighTaxRate ? { value: 'ALTO', tone: 'negative' } : { value: 'OK', tone: 'neutral' }}
          onClick={() => navigate('/configuracoes')}
          hrefLabel="Configurações"
        />
      </div>

      <p className="text-xs text-gray-500 dark:text-slate-400">
        Nota: KPIs baseados nos pedidos Mercado Livre e status de pagamento.
      </p>
    </div>
  );
}
