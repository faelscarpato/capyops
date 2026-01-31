import { useEffect, useState } from 'react';
import type { Expense } from '../lib/types';
import { listExpenses } from '../lib/db';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import { ArrowUpRight, DollarSign, Download } from 'lucide-react';
import { exportToCSV } from '../lib/utils';

export default function ExpensesPage() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const exps = await listExpenses();
      setExpenses(exps);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar despesas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const [filter, setFilter] = useState('');

  const filtered = (expenses || []).filter(e => {
    if (!e) return false;
    if (!filter) return true;
    const s = filter.toLowerCase();
    return (
      (e.category || '').toLowerCase().includes(s) ||
      (e.vendor || '').toLowerCase().includes(s) ||
      (e.notes || '').toLowerCase().includes(s)
    );
  });

  const total = filtered.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel de Despesas"
        subtitle="Analise de custos operacionais e histórico."
        actions={
          <div className="flex flex-wrap gap-2 items-center">
            <input
              className="input px-3 py-1 text-sm w-48"
              placeholder="Filtrar..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
            <button className="btn-ghost flex items-center gap-1" onClick={() => exportToCSV(filtered, 'despesas.csv')} disabled={loading}>
              <Download size={16} /> CSV
            </button>
            <button className="btn-ghost" onClick={refresh} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
            <button className="btn-primary" onClick={() => window.location.href = '/cadastros'}>
              Gerenciar Despesas (Cadastros)
            </button>
          </div>
        }
      />

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
          {err}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase">Total Despesas (Geral)</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
          </div>
          <div className="p-3 bg-red-50 rounded-full text-red-600 dark:bg-red-900/30">
            <ArrowUpRight size={24} />
          </div>
        </div>
        {/* More KPI cards could go here */}
      </div>

      <SectionCard title="Histórico de Despesas">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-2 py-2 font-semibold">Data</th>
                <th className="px-2 py-2 font-semibold">Categoria</th>
                <th className="px-2 py-2 font-semibold">Fornecedor</th>
                <th className="px-2 py-2 font-semibold">Pagamento</th>
                <th className="px-2 py-2 text-right font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filtered.map((ex) => (
                <tr key={ex.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-900">
                  <td className="px-2 py-3 text-gray-600 dark:text-gray-300">
                    {new Date(ex.paid_at).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-3 font-medium text-gray-900 dark:text-slate-100">
                    {ex.category}
                    {ex.notes && <div className="text-xs text-gray-400 font-normal">{ex.notes}</div>}
                  </td>
                  <td className="px-2 py-3 text-gray-600 dark:text-gray-400">{ex.vendor || '—'}</td>
                  <td className="px-2 py-3 text-gray-600 dark:text-gray-400">{ex.payment_method || '—'}</td>
                  <td className="px-2 py-3 text-right font-bold text-gray-700 dark:text-slate-200">
                    {ex.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              ))}
              {!filtered.length && !loading ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6">
                    <div className="text-center text-sm text-gray-500 dark:text-slate-400">
                      Nenhuma despesa registrada.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
