import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import { addExpense, createSaleException, getSalesHistory, type SalesHistoryRow } from '../lib/db';
import type { SaleException, SaleStatus } from '../lib/types';

type ExceptionType = SaleException['type'];

function fmtBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
}

function statusLabel(status: SaleStatus) {
  const map: Record<SaleStatus, string> = {
    completed: 'Concluida',
    cancelled: 'Cancelada',
    returned: 'Devolvida',
    exchanged: 'Trocada'
  };
  return map[status];
}

function StatusChip({ status }: { status: SaleStatus }) {
  const styles: Record<SaleStatus, string> = {
    completed: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-200',
    cancelled: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200',
    returned: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-200',
    exchanged: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-900/30 dark:text-blue-200'
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${styles[status]}`}>
      {statusLabel(status)}
    </span>
  );
}

export default function SalesHistoryPage() {
  const [rows, setRows] = useState<SalesHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<SalesHistoryRow | null>(null);
  const [exceptionType, setExceptionType] = useState<ExceptionType>('return');
  const [reason, setReason] = useState('');
  const [restock, setRestock] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SaleStatus>('all');
  const [hasLoss, setHasLoss] = useState(false);
  const [lossAmount, setLossAmount] = useState('');
  const [lossNotes, setLossNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const data = await getSalesHistory();
      setRows(data);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar historico de vendas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const normalizedRows = useMemo(() => {
    return rows.map((row) => ({
      ...row,
      status: (row.status ?? 'completed') as SaleStatus
    }));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return normalizedRows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (!query) return true;
      const haystack = [
        row.product?.name,
        row.product?.variant,
        row.channel,
        row.notes,
        row.id
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [normalizedRows, searchText, statusFilter]);

  async function onConfirmException() {
    if (!selectedSale) return;
    if (hasLoss && Number(lossAmount || 0) <= 0) {
      setErr('Informe o valor do prejuizo.');
      return;
    }
    setSaving(true);
    try {
      await createSaleException(selectedSale.id, selectedSale.product_id, selectedSale.quantity, {
        type: exceptionType,
        reason: reason.trim() ? reason.trim() : null,
        restock_inventory: restock
      });
      if (hasLoss && Number(lossAmount || 0) > 0) {
        const notes = [
          `Venda ${selectedSale.id}`,
          `Tipo: ${exceptionType}`,
          `Produto: ${selectedSale.product?.name ?? 'Produto'}`,
          lossNotes.trim() ? `Obs: ${lossNotes.trim()}` : null,
          reason.trim() ? `Motivo: ${reason.trim()}` : null
        ]
          .filter(Boolean)
          .join(' • ');
        await addExpense({
          category: 'Prejuizo devolucao',
          amount: Number(lossAmount || 0),
          notes
        });
      }
      setSelectedSale(null);
      setReason('');
      setRestock(true);
      setHasLoss(false);
      setLossAmount('');
      setLossNotes('');
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao registrar excecao.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historico de vendas"
        subtitle="Controle de devolucoes, cancelamentos e trocas."
        actions={
          <button className="btn-ghost" type="button" onClick={refresh} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        }
      />

      {err ? (
        <div className="alert alert-error">
          {err}
        </div>
      ) : null}

      <SectionCard title="Filtros e busca">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="label mb-1">Busca</div>
            <input
              className="input"
              placeholder="Produto, variante, canal ou ID da venda"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div>
            <div className="label mb-1">Status</div>
            <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option value="all">Todos</option>
              <option value="completed">Concluida</option>
              <option value="cancelled">Cancelada</option>
              <option value="returned">Devolvida</option>
              <option value="exchanged">Trocada</option>
            </select>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Vendas registradas">
        <div className="table-scroll">
          <table className="table-base w-full text-left">
            <thead>
              <tr>
                <th className="hidden sm:table-cell">Data</th>
                <th>Produto</th>
                <th className="text-right">Valor</th>
                <th className="hidden md:table-cell">Canal</th>
                <th className="text-center">Status</th>
                <th className="hidden lg:table-cell text-right">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const canHandle = row.status === 'completed';
                const totalValue = Number(row.sale_price ?? 0) * Number(row.quantity ?? 0);
                return (
                  <tr key={row.id}>
                    <td className="hidden sm:table-cell">{formatDate(row.sold_at)}</td>
                    <td>
                      <div className="flex flex-col">
                        <div className="font-medium">{row.product?.name ?? 'Produto'}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">
                          {row.product?.variant ?? '-'} • <span className="sm:hidden">{formatDate(row.sold_at)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-right">{fmtBRL(totalValue)}</td>
                    <td className="hidden md:table-cell">{row.channel}</td>
                    <td className="text-center">
                      <StatusChip status={row.status} />
                    </td>
                    <td className="hidden lg:table-cell text-right">
                      {canHandle ? (
                        <button
                          className="btn-ghost text-xs"
                          type="button"
                          onClick={() => {
                            setSelectedSale(row);
                            setExceptionType('return');
                            setReason('');
                            setRestock(true);
                            setHasLoss(false);
                            setLossAmount('');
                            setLossNotes('');
                          }}
                        >
                          Devolver
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 dark:text-slate-500">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!filteredRows.length ? (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-sm text-gray-500 dark:text-slate-400">
                    Nenhuma venda encontrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {selectedSale ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-lg p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Registrar excecao</h3>
              <button className="btn-ghost" type="button" onClick={() => setSelectedSale(null)} disabled={saving}>
                Fechar
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="label mb-1">Tipo</div>
                <select
                  className="input"
                  value={exceptionType}
                  onChange={(e) => setExceptionType(e.target.value as ExceptionType)}
                >
                  <option value="return">Devolucao</option>
                  <option value="cancellation">Cancelamento</option>
                  <option value="exchange">Troca</option>
                </select>
              </div>

              <div>
                <div className="label mb-1">Motivo</div>
                <textarea
                  className="input min-h-[96px]"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva o motivo da excecao"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
                Devolver ao estoque?
              </label>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                  <input type="checkbox" checked={hasLoss} onChange={(e) => setHasLoss(e.target.checked)} />
                  Houve prejuizo financeiro?
                </label>
                {hasLoss ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <div className="label mb-1">Valor do prejuizo</div>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={lossAmount}
                        onChange={(e) => setLossAmount(e.target.value)}
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <div className="label mb-1">Observacoes</div>
                      <input
                        className="input"
                        value={lossNotes}
                        onChange={(e) => setLossNotes(e.target.value)}
                        placeholder="Frete reverso, embalagem, etc."
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button className="btn-ghost" type="button" onClick={() => setSelectedSale(null)} disabled={saving}>
                Cancelar
              </button>
              <button className="btn-primary" type="button" onClick={onConfirmException} disabled={saving}>
                {saving ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}



