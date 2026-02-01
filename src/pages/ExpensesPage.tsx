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
              className="input w-full px-3 py-1 text-sm sm:w-48"
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
        <div className="alert alert-error">
          {err}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="card flex items-center justify-between p-6">
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase">Total Despesas (Geral)</p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </h3>
          </div>
          <div className="rounded-full bg-red-50 p-3 text-red-600 dark:bg-red-900/30">
            <ArrowUpRight size={24} />
          </div>
        </div>
        {/* More KPI cards could go here */}
      </div>

      <SectionCard title="Histórico de Despesas">
        <div className="table-scroll">
          <table className="table-base w-full text-left">
            <thead>
              <tr>
                <th>Data</th>
                <th>Categoria</th>
                <th>Fornecedor</th>
                <th>Pagamento</th>
                <th className="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ex) => (
                <tr key={ex.id}>
                  <td className="table-muted">
                    {new Date(ex.paid_at).toLocaleDateString()}
                  </td>
                  <td>
                    {ex.category}
                    {ex.notes && <div className="text-xs text-gray-400 font-normal">{ex.notes}</div>}
                  </td>
                  <td className="table-muted">{ex.vendor || '—'}</td>
                  <td className="table-muted">{ex.payment_method || '—'}</td>
                  <td className="text-right font-bold">
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


