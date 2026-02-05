import { useEffect, useState } from 'react';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import { listMeliShipments, type MeliShipment } from '../lib/db';
import { meliDownloadLabel } from '../lib/meliApi';

function resolveDeadline(payload: any): string | null {
  if (!payload) return null;
  return (
    payload?.shipping_option?.estimated_handling_limit?.date ??
    payload?.estimated_handling_limit?.date ??
    payload?.date_created ??
    null
  );
}

export default function OperationsShipmentsPanel() {
  const [rows, setRows] = useState<MeliShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const data = await listMeliShipments(50);
      setRows(data);
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao carregar envios.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Expedicao"
        subtitle="Envios e etiquetas do Mercado Livre."
        actions={
          <button className="btn-ghost" onClick={refresh} disabled={loading}>
            Atualizar
          </button>
        }
      />

      {err ? <div className="alert alert-error">{err}</div> : null}

      <SectionCard title="Envios recentes">
        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : (
          <div className="table-scroll">
            <table className="table-base w-full text-left text-xs">
              <thead>
                <tr>
                  <th>ID envio</th>
                  <th>Status</th>
                  <th>Prazo</th>
                  <th className="text-right">Etiqueta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const deadline = resolveDeadline(s.payload);
                  return (
                    <tr key={s.id}>
                      <td>{s.ml_shipment_id}</td>
                      <td>{s.status || '—'}</td>
                      <td>{deadline ? new Date(deadline).toLocaleString('pt-BR') : '—'}</td>
                      <td className="text-right">
                        <button className="btn-ghost text-xs" onClick={() => meliDownloadLabel(s.ml_shipment_id)}>
                          Baixar etiqueta
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-500">Nenhum envio encontrado.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
