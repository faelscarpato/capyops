import { useEffect, useMemo, useState } from 'react';
import { getSalesHistory } from '../../../lib/db';
import type { SaleStatus } from '../../../lib/types';

function fmtBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CancelLog() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await getSalesHistory();
        setRows(data);
      } catch (e: any) {
        setErr(e?.message ?? 'Erro ao carregar cancelamentos.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cancelled = useMemo(
    () => rows.filter((r) => (r.status as SaleStatus) === 'cancelled'),
    [rows]
  );

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="text-sm font-semibold">Histórico de cancelamentos</div>
        <div className="text-xs text-gray-500 mt-1">Baseado em vendas com status cancelado.</div>
        {err ? <div className="mt-2 text-xs text-red-600">{err}</div> : null}
      </div>
      <div className="card p-4">
        <div className="table-scroll">
          <table className="table-base w-full text-left">
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th className="text-right">Quantidade</th>
                <th className="text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {cancelled.map((r) => (
                <tr key={r.id}>
                  <td className="table-muted">{new Date(r.sold_at).toLocaleDateString('pt-BR')}</td>
                  <td>{r.product?.name ?? 'Produto'}</td>
                  <td className="text-right">{r.quantity}</td>
                  <td className="text-right">{fmtBRL(r.sale_price * r.quantity)}</td>
                </tr>
              ))}
              {!cancelled.length && !loading ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-gray-500">
                    Nenhum cancelamento registrado.
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
