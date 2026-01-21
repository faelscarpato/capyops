import { useEffect, useState } from 'react';
import type { Expense } from '../lib/types';
import { listExpenses, addExpense } from '../lib/db';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';

function toNumber(v: string): number {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export default function ExpensesPage() {
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    category: '',
    amount: 0,
    payment_method: '',
    vendor: '',
    notes: ''
  });

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

  async function onAdd() {
    setErr(null);
    if (!draft.category.trim()) {
      setErr('Informe uma categoria.');
      return;
    }
    try {
      await addExpense({
        category: draft.category.trim(),
        amount: draft.amount,
        payment_method: draft.payment_method?.trim() || null,
        vendor: draft.vendor?.trim() || null,
        notes: draft.notes?.trim() || null
      });
      setDraft({ category: '', amount: 0, payment_method: '', vendor: '', notes: '' });
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao registrar despesa.');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Despesas"
        subtitle="Registro de custos operacionais."
        actions={
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={refresh} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        }
      />

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
          {err}
        </div>
      ) : null}

      <SectionCard
        title="Adicionar despesa"
        action={
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={onAdd}>
              Salvar
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <div className="label mb-1">Categoria</div>
            <input
              className="input"
              value={draft.category}
              onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
              placeholder="embalagem / marketing / transporte"
            />
          </div>
          <div>
            <div className="label mb-1">Valor (R$)</div>
            <input
              className="input"
              inputMode="decimal"
              value={String(draft.amount)}
              onChange={(e) => setDraft((d) => ({ ...d, amount: toNumber(e.target.value) }))}
            />
          </div>
          <div>
            <div className="label mb-1">Forma de pagamento</div>
            <input
              className="input"
              value={draft.payment_method}
              onChange={(e) => setDraft((d) => ({ ...d, payment_method: e.target.value }))}
              placeholder="pix / cartao / dinheiro"
            />
          </div>
          <div>
            <div className="label mb-1">Fornecedor (opcional)</div>
            <input
              className="input"
              value={draft.vendor}
              onChange={(e) => setDraft((d) => ({ ...d, vendor: e.target.value }))}
              placeholder="nome da loja"
            />
          </div>
          <div className="md:col-span-4">
            <div className="label mb-1">Observação</div>
            <input
              className="input"
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="anote detalhes da despesa"
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Despesas registradas">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-2 py-2 font-semibold">Categoria</th>
                <th className="px-2 py-2 text-right font-semibold">Valor</th>
                <th className="px-2 py-2 font-semibold">Data</th>
                <th className="px-2 py-2 font-semibold">Pagamento</th>
                <th className="px-2 py-2 font-semibold">Fornecedor</th>
                <th className="px-2 py-2 font-semibold">Observação</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((ex) => (
                <tr key={ex.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-900">
                  <td className="px-2 py-3">
                    <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{ex.category}</div>
                  </td>
                  <td className="px-2 py-3 text-right">
                    {ex.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-2 py-3">{new Date(ex.paid_at).toLocaleDateString()}</td>
                  <td className="px-2 py-3">{ex.payment_method || '—'}</td>
                  <td className="px-2 py-3">{ex.vendor || '—'}</td>
                  <td className="px-2 py-3">{ex.notes || '—'}</td>
                </tr>
              ))}
              {!expenses.length && !loading ? (
                <tr>
                  <td colSpan={6} className="px-2 py-6">
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
