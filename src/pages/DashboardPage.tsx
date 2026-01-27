import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { AlertTriangle, DollarSign, ListChecks, Package } from 'lucide-react';
import { ensureTodayTasks, getExceptionRateLastNDays, getSalesSummaryLastNDays, getTodayTasks, listProducts, setTaskDone } from '../lib/db';
import { readCompanySettings } from '../lib/companySettings';
import PageHeader from '../ui/PageHeader';
import MetricCard from '../ui/MetricCard';
import SectionCard from '../ui/SectionCard';

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

  const tasksDone = tasks.filter((t) => t.done).length;
  const tasksTotal = tasks.length;
  const tasksPending = tasks.filter((t) => !t.done);
  const tasksCompleted = tasks.filter((t) => t.done);
  const progressPct = tasksTotal ? Math.round((tasksDone / tasksTotal) * 100) : 0;

  const lowStockCritical = lowStock.filter((p: any) => (p.stock ?? 0) <= 0);
  const lowStockWarning = lowStock.filter((p: any) => (p.stock ?? 0) > 0);

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

  function handleTaskToggle(id: string, current: boolean, e: ChangeEvent<HTMLInputElement>) {
    const next = e.currentTarget.checked;
    toggleTask(id, next ?? !current);
  }


  function handleRefresh() {
    if (!loading) {
      refresh();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        subtitle="Abra aqui todo dia e siga a operacao sem falha."
        actions={
          <button className="btn-ghost" type="button" onClick={handleRefresh} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        }
      />

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
          {err}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <MetricCard
            title="Hoje"
            value={loading ? '—' : day ? fmtBRL(day.gross) : '—'}
            subtitle={`Lucro estimado: ${day ? fmtBRL(day.net_est) : '—'} • Vendas: ${day ? day.count : '—'}`}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Vendas: {day ? day.count : '—'}
            </span>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Lucro: {day ? fmtBRL(day.net_est) : '—'}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <MetricCard
            title="Ultimos 30 dias"
            value={loading ? '—' : month ? fmtBRL(month.gross) : '—'}
            subtitle={`Lucro estimado: ${month ? fmtBRL(month.net_est) : '—'} • Vendas: ${month ? month.count : '—'}`}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Vendas: {month ? month.count : '—'}
            </span>
            <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              Lucro: {month ? fmtBRL(month.net_est) : '—'}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <div
            className={`rounded-xl border p-4 shadow-soft ${
              (exceptionRate?.rate ?? 0) > 2
                ? 'border-red-200 bg-gradient-to-b from-red-50 via-white to-white dark:border-red-900/60 dark:from-red-900/30 dark:via-slate-900 dark:to-slate-900'
                : 'border-gray-200 bg-gradient-to-b from-blue-50 via-white to-white dark:border-slate-800 dark:from-cyan-400/15 dark:via-slate-900 dark:to-slate-900'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                <span className={`${(exceptionRate?.rate ?? 0) > 2 ? 'text-red-600 dark:text-red-300' : 'text-blue-600 dark:text-cyan-300'}`}>
                  <Package className="h-4 w-4" />
                </span>
                <span className="font-medium uppercase tracking-wide">Taxa de devolucao</span>
              </div>
              <div className="text-3xl font-semibold text-gray-900 dark:text-slate-100">
                {loading ? '—' : `${(exceptionRate?.rate ?? 0).toFixed(1)}%`}
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400">
                {exceptionRate ? `${exceptionRate.problem} de ${exceptionRate.total} pedidos (30d)` : '—'}
              </div>
              {(exceptionRate?.rate ?? 0) > 2 ? (
                <div className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
                  Alerta: acima de 2%
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <MetricCard
            title="Estoque critico"
            value={loading ? '—' : String(lowStock.length)}
            subtitle="Itens com estoque menor ou igual ao minimo"
            icon={<Package className="h-4 w-4" />}
          />
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
              Sem estoque: {lowStockCritical.length}
            </span>
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-200">
              Baixo: {lowStockWarning.length}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-8">
          <SectionCard
            title="Tarefas de hoje"
            action={
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {tasksDone}/{tasksTotal} concluidas
                </span>
                <ListChecks className="h-4 w-4 text-gray-500 dark:text-slate-400" />
              </div>
            }
          >
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Progresso do dia
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-cyan-500 transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
              <div>
                {loading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-8 rounded-lg bg-gray-200 dark:bg-slate-800" />
                    <div className="h-8 rounded-lg bg-gray-200 dark:bg-slate-800" />
                    <div className="h-8 rounded-lg bg-gray-200 dark:bg-slate-800" />
                  </div>
                ) : tasks.length ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                        Pendentes ({tasksPending.length})
                      </div>
                      <ul className="mt-2 space-y-2">
                        {tasksPending.map((t) => (
                          <li key={t.id} className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={t.done}
                              onChange={(e) => handleTaskToggle(t.id, t.done, e)}
                              className="h-4 w-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900"
                            />
                            <span className="text-sm text-gray-800 dark:text-slate-200">{t.task_name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                        Concluidas ({tasksCompleted.length})
                      </div>
                      <ul className="mt-2 space-y-2">
                        {tasksCompleted.map((t) => (
                          <li key={t.id} className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={t.done}
                              onChange={(e) => handleTaskToggle(t.id, t.done, e)}
                              className="h-4 w-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900"
                            />
                            <span className="text-sm text-gray-500 line-through dark:text-slate-400">
                              {t.task_name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 dark:text-slate-400">Nenhuma tarefa carregada.</div>
                )}
              </div>
            </div>
          </SectionCard>
        </div>
        <div className="md:col-span-4">
          <SectionCard title="Alertas" action={<AlertTriangle className="h-4 w-4 text-gray-500 dark:text-slate-400" />}>
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
          <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Tarefas
            </div>
            <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-slate-100">
              {tasksDone} de {tasksTotal}
            </div>
            <div className="text-sm text-gray-500 dark:text-slate-400">Pendentes: {tasksPending.length}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Estoque critico
            </div>
            <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-slate-100">{lowStock.length}</div>
            <div className="text-sm text-gray-500 dark:text-slate-400">Sem estoque: {lowStockCritical.length}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Vendas hoje
            </div>
            <div className="mt-1 text-xl font-semibold text-gray-900 dark:text-slate-100">{day ? day.count : '—'}</div>
            <div className="text-sm text-gray-500 dark:text-slate-400">
              Receita: {day ? fmtBRL(day.gross) : '—'}
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
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

      <p className="text-xs text-gray-500 dark:text-slate-400">
        Nota: lucro e estimado com taxa ML padrao (17%) quando nao informado na venda.
      </p>
    </div>
  );
}
