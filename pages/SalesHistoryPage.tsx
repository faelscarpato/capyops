import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import { listMeliOrders, listMeliShipments, type MeliOrder } from '../lib/db';

function fmtBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('pt-BR');
}

function isPaidOrder(order: any): boolean {
  if (!order) return false;
  if (order.status === 'paid') return true;
  if (Array.isArray(order.payments)) {
    return order.payments.some((p: any) => p?.status === 'approved' || p?.status === 'paid');
  }
  return false;
}

export default function SalesHistoryPage() {
  const [rows, setRows] = useState<MeliOrder[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid'>('paid');

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listMeliOrders(80);
      const sh = await listMeliShipments(80);
      setRows(data);
      setShipments(sh);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar vendas do ML.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const shipmentDeadlineById = useMemo(() => {
    const map = new Map<string, string | null>();
    shipments.forEach((s) => {
      const p = s.payload || {};
      const deadline =
        p?.shipping_option?.estimated_handling_limit?.date ??
        p?.estimated_handling_limit?.date ??
        p?.date_created ??
        null;
      map.set(String(s.ml_shipment_id), deadline);
    });
    return map;
  }, [shipments]);

  const filtered = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return rows.filter((row) => {
      const order = row.payload || {};
      if (statusFilter === 'paid' && !isPaidOrder(order)) return false;
      if (!query) return true;
      const buyer = order?.buyer || {};
      const haystack = [
        row.ml_order_id,
        order?.status,
        buyer?.nickname,
        buyer?.first_name,
        buyer?.last_name
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [rows, searchText, statusFilter]);

  const paidOrders = useMemo(() => {
    return rows.filter((r) => isPaidOrder(r.payload));
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico de vendas (Mercado Livre)"
        subtitle="Vendas automáticas + status de pagamento e prazo de postagem."
        actions={
          <button className="btn-ghost" type="button" onClick={refresh} disabled={loading}>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        }
      />

      {err ? <div className="alert alert-error">{err}</div> : null}

      <SectionCard title="Pagamento aprovado">
        <div className="table-scroll">
          <table className="table-base w-full text-left text-xs">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Prazo postagem</th>
              </tr>
            </thead>
            <tbody>
              {paidOrders.map((row) => {
                const order = row.payload || {};
                const buyer = order?.buyer || {};
                const total = Number(order?.total_amount ?? 0);
                const shipId = order?.shipping?.id ? String(order.shipping.id) : null;
                const deadline = shipId ? shipmentDeadlineById.get(shipId) ?? null : null;
                return (
                  <tr key={row.id}>
                    <td className="font-medium">{row.ml_order_id}</td>
                    <td>{buyer.nickname || [buyer.first_name, buyer.last_name].filter(Boolean).join(' ') || '—'}</td>
                    <td>{fmtBRL(total)}</td>
                    <td>Pagamento aprovado</td>
                    <td className="font-semibold text-amber-700 dark:text-amber-200">{formatDate(deadline)}</td>
                  </tr>
                );
              })}
              {!paidOrders.length ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">Nenhum pedido aprovado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Filtro e histórico geral">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div className="label mb-1">Busca</div>
            <input
              className="input"
              placeholder="Pedido, cliente, status"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
          <div>
            <div className="label mb-1">Status</div>
            <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
              <option value="paid">Pagamento aprovado</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Pedidos Mercado Livre">
        <div className="table-scroll">
          <table className="table-base w-full text-left text-xs">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Cliente</th>
                <th>Status</th>
                <th>Itens</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const order = row.payload || {};
                const buyer = order?.buyer || {};
                const items = Array.isArray(order.order_items) ? order.order_items : [];
                return (
                  <tr key={row.id}>
                    <td>
                      <div className="font-medium">{row.ml_order_id}</div>
                      <div className="text-[11px] text-gray-500">{formatDate(order.date_created)}</div>
                    </td>
                    <td>{buyer.nickname || [buyer.first_name, buyer.last_name].filter(Boolean).join(' ') || '—'}</td>
                    <td>{order.status || '—'}</td>
                    <td>
                      <div className="space-y-1">
                        {items.slice(0, 3).map((it: any, idx: number) => (
                          <div key={idx} className="text-[11px] text-gray-600 dark:text-slate-300">
                            {it?.item?.title || it?.item_id || 'Item'} • x{it?.quantity ?? 1}
                          </div>
                        ))}
                        {items.length > 3 ? (
                          <div className="text-[11px] text-gray-400">+{items.length - 3} itens</div>
                        ) : null}
                      </div>
                    </td>
                    <td className="text-right">{fmtBRL(Number(order?.total_amount ?? 0))}</td>
                  </tr>
                );
              })}
              {!filtered.length ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">Nenhum pedido encontrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
