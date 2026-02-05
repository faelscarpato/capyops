import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import { listMeliOrders, listMeliShipments, type MeliShipment } from '../lib/db';
import { meliDownloadLabel, meliSyncShipments } from '../lib/meliApi';
import { TaskTabs, useTaskTabs } from '../ui/TaskTabs';

function resolveDeadline(payload: any): string | null {
  if (!payload) return null;
  return (
    payload?.shipping_option?.estimated_handling_limit?.date ??
    payload?.estimated_handling_limit?.date ??
    payload?.date_created ??
    null
  );
}

function normalizeDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR');
}

const SHIPMENT_TABS = [
  { id: 'hoje', label: 'Envios de hoje' },
  { id: 'proximos', label: 'Próximos dias' },
  { id: 'transito', label: 'Em trânsito' },
  { id: 'finalizadas', label: 'Finalizadas' }
];

export default function OperationsShipmentsPanel() {
  const [rows, setRows] = useState<MeliShipment[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const { activeTab, setActiveTab } = useTaskTabs(SHIPMENT_TABS, 'hoje', 'shipTab');

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const [data, ord] = await Promise.all([listMeliShipments(80), listMeliOrders(80)]);
      setRows(data);
      setOrders(ord);
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao carregar envios.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setErr(null);
    setLoading(true);
    try {
      await meliSyncShipments();
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao sincronizar envios.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const orderByShipmentId = useMemo(() => {
    const map = new Map<string, any>();
    orders.forEach((o) => {
      const payload = o?.payload || {};
      const shipId = payload?.shipping?.id;
      if (shipId) map.set(String(shipId), o);
    });
    return map;
  }, [orders]);

  const enriched = useMemo(() => {
    return rows.map((s) => {
      const shipmentId = String(s.ml_shipment_id);
      const order = orderByShipmentId.get(shipmentId) ?? null;
      const shipPayload = s.payload || {};
      const orderPayload = order?.payload || {};
      const deadline = resolveDeadline(shipPayload);
      const status = String(shipPayload?.status ?? s.status ?? '');
      return { shipmentId, order, shipPayload, orderPayload, deadline, status };
    });
  }, [rows, orderByShipmentId]);

  const filtered = useMemo(() => {
    const today = new Date();
    return enriched.filter((row) => {
      const deadlineDate = normalizeDate(row.deadline);
      const status = row.status.toLowerCase();

      if (activeTab === 'hoje') {
        if (!deadlineDate) return false;
        return isSameDay(deadlineDate, today);
      }
      if (activeTab === 'proximos') {
        if (!deadlineDate) return false;
        return deadlineDate.getTime() > today.getTime() && !isSameDay(deadlineDate, today);
      }
      if (activeTab === 'transito') {
        return ['shipped', 'in_transit', 'out_for_delivery', 'ready_to_ship'].some((k) => status.includes(k));
      }
      if (activeTab === 'finalizadas') {
        return ['delivered', 'cancelled', 'returned', 'not_delivered'].some((k) => status.includes(k));
      }
      return true;
    });
  }, [enriched, activeTab]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Expedicao"
        subtitle="Envios e etiquetas do Mercado Livre."
        actions={
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={refresh} disabled={loading}>
              Atualizar
            </button>
            <button className="btn-primary" onClick={handleSync} disabled={loading}>
              Sincronizar envios
            </button>
          </div>
        }
      />

      {err ? <div className="alert alert-error">{err}</div> : null}

      <TaskTabs tabs={SHIPMENT_TABS} activeTab={activeTab} onChange={setActiveTab} ariaLabel="Expedicao" />

      <SectionCard title="Envios recentes">
        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <div className="table-scroll">
            <table className="table-base w-full text-left text-xs">
              <thead>
                <tr>
                  <th>ID envio</th>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Prazo</th>
                  <th className="text-right">Etiqueta</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const orderPayload = s.orderPayload || {};
                  const buyer = orderPayload?.buyer || {};
                  const deadline = s.deadline;
                  return (
                    <tr key={s.shipmentId}>
                      <td>{s.shipmentId}</td>
                      <td>{s.order?.ml_order_id ?? '—'}</td>
                      <td>{buyer.nickname || [buyer.first_name, buyer.last_name].filter(Boolean).join(' ') || '—'}</td>
                      <td>{s.status || '—'}</td>
                      <td>{deadline ? new Date(deadline).toLocaleString('pt-BR') : '—'}</td>
                      <td className="text-right">
                        <button className="btn-ghost text-xs" onClick={() => meliDownloadLabel(s.shipmentId)}>
                          Baixar etiqueta
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length ? (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-gray-500">Nenhum envio encontrado.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {activeTab === 'transito' ? (
        <SectionCard title="Detalhes do envio (em transito)">
          {!filtered.length ? (
            <div className="text-sm text-gray-500">Sem envios em transito.</div>
          ) : (
            <div className="space-y-4">
              {filtered.map((s) => {
                const orderPayload = s.orderPayload || {};
                const items = Array.isArray(orderPayload?.order_items) ? orderPayload.order_items : [];
                const ship = s.shipPayload || {};
                const receiver = ship?.receiver_address || {};
                const tracking = ship?.tracking_number || ship?.tracking_id || ship?.tracking?.number || null;

                return (
                  <div key={`detail-${s.shipmentId}`} className="rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-soft dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs text-gray-500">Pedido</div>
                        <div className="font-semibold text-gray-900 dark:text-slate-100">{s.order?.ml_order_id ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Status envio</div>
                        <div className="font-semibold text-gray-900 dark:text-slate-100">{s.status || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Prazo</div>
                        <div className="font-semibold text-gray-900 dark:text-slate-100">{formatDate(s.deadline)}</div>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-ghost text-xs" onClick={() => meliDownloadLabel(s.shipmentId)}>
                          Baixar etiqueta
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Itens</div>
                        <div className="mt-2 space-y-2">
                          {items.length ? (
                            items.map((it: any, idx: number) => (
                              <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/40">
                                <div className="font-semibold text-gray-800 dark:text-slate-100">{it?.item?.title || it?.item_id || 'Item'}</div>
                                <div className="text-gray-500 dark:text-slate-400">Qtd: {it?.quantity ?? 1}</div>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-gray-500">Itens nao disponiveis.</div>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dados do envio</div>
                        <div className="mt-2 space-y-2 text-xs text-gray-600 dark:text-slate-300">
                          <div><span className="font-semibold">Transportadora:</span> {ship?.tracking_method?.type || ship?.tracking_method || '—'}</div>
                          <div><span className="font-semibold">Codigo rastreio:</span> {tracking || '—'}</div>
                          <div><span className="font-semibold">Endereco:</span> {receiver?.address_line || receiver?.street_name || '—'}</div>
                          <div><span className="font-semibold">Cidade/UF:</span> {[receiver?.city?.name, receiver?.state?.name].filter(Boolean).join(' / ') || '—'}</div>
                          <div><span className="font-semibold">CEP:</span> {receiver?.zip_code || '—'}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      ) : null}
    </div>
  );
}
