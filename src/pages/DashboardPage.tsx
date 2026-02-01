import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { AlertTriangle, BarChart3, DollarSign, Package, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  createTodayTask,
  ensureTodayTasks,
  getExceptionRateLastNDays,
  getSalesSummaryLastNDays,
  getTodayTasks,
  listProducts,
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

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Array<{ id: string; task_name: string; done: boolean }>>([]);
  const [products, setProducts] = useState<any[]>([]);
  const companySettings = readCompanySettings();
  const [day, setDay] = useState<{ gross: number; net_est: number; count: number } | null>(null);
  const [month, setMonth] = useState<{ gross: number; net_est: number; count: number } | null>(null);
  const [exceptionRate, setExceptionRate] = useState<{ rate: number; total: number; problem: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      await ensureTodayTasks(DEFAULT_TASKS);
      const [t, p, s1, s30, rate] = await Promise.all([
        getTodayTasks(),
        listProducts(),
        getSalesSummaryLastNDays(1),
        getSalesSummaryLastNDays(30),
        getExceptionRateLastNDays(30)
      ]);
      setTasks(t);
      setProducts(p);
      setDay(s1);
      setMonth(s30);
      setExceptionRate(rate);
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

  const okPercent = Math.max(0, 100 - (exceptionRate?.rate ?? 0));
  const okPercentRounded = Math.round(okPercent);
  const donutStyle: CSSProperties = {
    background: `conic-gradient(#5f5bff 0 ${okPercent}%, #ff8a65 ${okPercent}% 100%)`
  };
  const dayNetPct = day?.gross ? Math.min(100, Math.round((day.net_est / day.gross) * 100)) : 0;
  const dayCountPct = month?.count ? Math.min(100, Math.round((day?.count ?? 0) / month.count * 100)) : 0;
  const monthNetPct = month?.gross ? Math.min(100, Math.round((month.net_est / month.gross) * 100)) : 0;

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
          title="Lucro hoje"
          value={loading ? '—' : day ? fmtBRL(day.net_est) : '—'}
          subtitle={
            <span className="text-xs">
              Bruto: {day ? fmtBRL(day.gross) : '—'} • Vendas: {day ? day.count : '—'}
            </span>
          }
          icon={<DollarSign className="h-4 w-4" />}
          onClick={() => navigate('/relatorios')}
          hrefLabel="Abrir relatórios"
        />

        <KpiCard
          title="Vendas hoje"
          value={loading ? '—' : day ? String(day.count) : '—'}
          subtitle={<span className="text-xs">Clique para registrar uma nova venda e baixar estoque.</span>}
          icon={<BarChart3 className="h-4 w-4" />}
          onClick={() => navigate('/nova-venda')}
          hrefLabel="Nova venda"
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
          title="Últimos 30 dias"
          value={loading ? '—' : month ? fmtBRL(month.gross) : '—'}
          subtitle={
            <span className="text-xs">
              Lucro estimado: {month ? fmtBRL(month.net_est) : '—'} • Vendas: {month ? month.count : '—'}
            </span>
          }
          icon={<DollarSign className="h-4 w-4" />}
          onClick={() => navigate('/relatorios')}
          hrefLabel="Abrir relatórios"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <SectionCard title="Reports" action="...">
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-slate-950">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Lucro hoje</div>
                  <div className="mt-2 text-xl font-bold text-gray-900 dark:text-slate-100">{day ? fmtBRL(day.net_est) : '—'}</div>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-slate-800">
                    <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${dayNetPct}%` }} />
                  </div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-slate-950">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Vendas hoje</div>
                  <div className="mt-2 text-xl font-bold text-gray-900 dark:text-slate-100">{day ? day.count : '—'}</div>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-slate-800">
                    <div className="h-2 rounded-full bg-amber-400" style={{ width: `${dayCountPct}%` }} />
                  </div>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 dark:bg-slate-950">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">Lucro 30d</div>
                  <div className="mt-2 text-xl font-bold text-gray-900 dark:text-slate-100">{month ? fmtBRL(month.net_est) : '—'}</div>
                  <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-slate-800">
                    <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${monthNetPct}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
        <div className="lg:col-span-4">
          <SectionCard title="Analytics" action="...">
            <div className="flex flex-col items-center gap-4">
              <div className="relative flex h-40 w-40 items-center justify-center rounded-full" style={donutStyle}>
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white text-center text-sm font-semibold text-gray-800 shadow-soft dark:bg-slate-900 dark:text-slate-100">
                  {loading ? '—' : `${okPercentRounded}%`}
                  <br />
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-400">Pedidos ok</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  Ok
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-orange-400" />
                  Retorno
                </span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
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
        </div>
        <div className="lg:col-span-4">
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
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <SectionCard title="Tarefas do dia">
            <TodayTasksPanel
              loading={loading}
              tasks={tasks}
              onToggle={toggleTask}
              onCreate={handleCreateTask}
            />
          </SectionCard>
        </div>
        <div className="lg:col-span-4">
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
              Vendas hoje
            </div>
            <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-slate-100">{day ? day.count : '—'}</div>
            <div className="text-sm text-gray-500 dark:text-slate-400">
              Receita: {day ? fmtBRL(day.gross) : '—'}
            </div>
          </div>
          <div className="card p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Impostos do dia
            </div>
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                <span>Aliquota combinada</span>
                <span className={isHighTaxRate ? 'text-red-600 dark:text-red-300 font-semibold' : ''}>
                  {effectiveTaxRate}%
                </span>
              </div>
              <div className="text-[10px] text-gray-400 dark:text-slate-500">
                CBS {companySettings.tax_cbs}% • IBS {companySettings.tax_ibs}% • IS {companySettings.tax_is}%
              </div>
              <div className="text-[10px] text-gray-400 dark:text-slate-500">
                Valores definidos em Configuracoes.
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <KpiCard
          title="Taxa de devolução"
          value={loading ? '—' : `${(exceptionRate?.rate ?? 0).toFixed(1)}%`}
          subtitle={<span className="text-xs">{exceptionRate ? `${exceptionRate.problem} de ${exceptionRate.total} pedidos (30d)` : '—'}</span>}
          icon={<Truck className="h-4 w-4" />}
          trend={
            (exceptionRate?.rate ?? 0) > 2
              ? { value: 'ALERTA > 2%', tone: 'negative' }
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
        Nota: lucro e estimado com taxa ML padrao (17%) quando nao informado na venda.
      </p>
    </div>
  );
}



