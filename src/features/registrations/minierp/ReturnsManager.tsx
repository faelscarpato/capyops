import { useEffect, useMemo, useState } from 'react';
import { addExpense, createSaleException, getSalesHistory } from '../../../lib/db';
import type { SaleStatus, SaleException } from '../../../lib/types';

function fmtBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function toISODate(value: string) {
  if (!value) return '';
  return `${value}T00:00:00`;
}

export default function ReturnsManager() {
  const [rows, setRows] = useState<Array<any>>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [exceptionType, setExceptionType] = useState<SaleException['type']>('return');
  const [reason, setReason] = useState('');
  const [restock, setRestock] = useState(true);
  const [refundAmount, setRefundAmount] = useState('');
  const [hasLoss, setHasLoss] = useState(false);
  const [lossAmount, setLossAmount] = useState('');

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const data = await getSalesHistory();
      setRows(data);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar devolucoes.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const startISO = toISODate(startDate);
    const endISO = `${endDate}T23:59:59`;
    return rows.filter((r) => {
      if (startISO && r.sold_at < startISO) return false;
      if (endISO && r.sold_at > endISO) return false;
      return true;
    });
  }, [rows, startDate, endDate]);

  const exceptions = useMemo(() => filtered.filter((r) => r.status && r.status !== 'completed'), [filtered]);
  const completed = useMemo(() => filtered.filter((r) => !r.status || r.status === 'completed'), [filtered]);

  const summary = useMemo(() => {
    const map: Record<SaleStatus, number> = {
      completed: 0,
      cancelled: 0,
      returned: 0,
      exchanged: 0
    };
    for (const r of filtered) {
      const s = (r.status ?? 'completed') as SaleStatus;
      map[s] += 1;
    }
    return map;
  }, [filtered]);

  async function onRegisterException() {
    const sale = rows.find((r) => r.id === selectedSaleId);
    if (!sale) {
      setErr('Selecione uma venda valida.');
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      await createSaleException(sale.id, sale.product_id, sale.quantity, {
        type: exceptionType,
        reason: reason.trim() ? reason.trim() : null,
        restock_inventory: restock,
        refund_amount: Number(refundAmount || 0)
      });

      if (hasLoss && Number(lossAmount || 0) > 0) {
        await addExpense({
          category: 'Prejuizo devolucao',
          amount: Number(lossAmount || 0),
          notes: `Venda ${sale.id} • ${exceptionType} • ${sale.product?.name ?? 'Produto'}`
        });
      }

      setSelectedSaleId('');
      setReason('');
      setRestock(true);
      setRefundAmount('');
      setHasLoss(false);
      setLossAmount('');
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao registrar excecao.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <div className="label mb-1">Data inicial</div>
            <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <div className="label mb-1">Data final</div>
            <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <div className="text-xs text-gray-500">Resumo</div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="badge badge-neutral">Concluidas: {summary.completed}</span>
              <span className="badge badge-danger">Canceladas: {summary.cancelled}</span>
              <span className="badge badge-warning">Devolvidas: {summary.returned}</span>
              <span className="badge badge-info">Trocadas: {summary.exchanged}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="text-sm font-semibold">Registrar excecao</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <div className="label mb-1">Venda</div>
            <select className="input" value={selectedSaleId} onChange={(e) => setSelectedSaleId(e.target.value)}>
              <option value="">Selecionar</option>
              {completed.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.product?.name ?? 'Produto'} • {new Date(r.sold_at).toLocaleDateString('pt-BR')} • {fmtBRL(r.sale_price * r.quantity)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label mb-1">Tipo</div>
            <select className="input" value={exceptionType} onChange={(e) => setExceptionType(e.target.value as any)}>
              <option value="return">Devolucao</option>
              <option value="cancellation">Cancelamento</option>
              <option value="exchange">Troca</option>
            </select>
          </div>
          <div>
            <div className="label mb-1">Reembolso (R$)</div>
            <input className="input" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <div className="label mb-1">Estorno em estoque</div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
              Repor item
            </label>
          </div>
          <div className="md:col-span-2">
            <div className="label mb-1">Motivo</div>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo da excecao" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={hasLoss} onChange={(e) => setHasLoss(e.target.checked)} />
            Registrar prejuizo financeiro
          </label>
          {hasLoss ? (
            <input className="input" value={lossAmount} onChange={(e) => setLossAmount(e.target.value)} placeholder="Valor do prejuizo" />
          ) : null}
          <button className="btn-primary" type="button" onClick={onRegisterException} disabled={loading}>
            {loading ? 'Salvando...' : 'Registrar'}
          </button>
        </div>

        {err ? <div className="text-xs text-red-600">{err}</div> : null}
      </div>

      <div className="card p-4">
        <div className="text-sm font-semibold">Excecoes registradas</div>
        <div className="table-scroll mt-3">
          <table className="table-base w-full text-left">
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th className="text-center">Status</th>
                <th className="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map((r) => (
                <tr key={r.id}>
                  <td className="table-muted">{new Date(r.sold_at).toLocaleDateString('pt-BR')}</td>
                  <td>{r.product?.name ?? 'Produto'}</td>
                  <td className="text-center">{r.status}</td>
                  <td className="text-right">{fmtBRL(r.sale_price * r.quantity)}</td>
                </tr>
              ))}
              {!exceptions.length ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-gray-500">
                    Nenhuma excecao no periodo.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
