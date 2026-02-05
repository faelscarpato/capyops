import { useEffect, useState } from 'react';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import { getMeliAccount, listMeliShipments } from '../lib/db';
import { meliOAuthStart, meliDisconnect, meliProcessWorker, meliDownloadLabel } from '../lib/meliApi';

export default function IntegrationsMeliPage() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [autoSync, setAutoSync] = useState(() => {
    const v = window.localStorage.getItem('meli_auto_sync');
    return v == null ? true : v === 'true';
  });
  const [shipments, setShipments] = useState<any[]>([]);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const acc = await getMeliAccount();
      setAccount(acc);
      const sh = await listMeliShipments(10);
      setShipments(sh);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar conta ML.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleConnect() {
    setErr(null);
    setBusy(true);
    try {
      const { url } = await meliOAuthStart();
      window.location.href = url;
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao iniciar conexão.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setErr(null);
    setBusy(true);
    try {
      await meliDisconnect();
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao desconectar.');
    } finally {
      setBusy(false);
    }
  }

  async function handleProcess() {
    setErr(null);
    setBusy(true);
    try {
      await meliProcessWorker();
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao processar pendências.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integração Mercado Livre"
        subtitle="Conecte sua conta ML para receber pedidos, perguntas e notificações."
        actions={
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={refresh} disabled={loading || busy}>
              Atualizar status
            </button>
            <button className="btn-primary" onClick={handleProcess} disabled={busy}>
              Processar pendências
            </button>
          </div>
        }
      />

      {err ? <div className="alert alert-error">{err}</div> : null}

      <SectionCard title="Status da conexão">
        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : account ? (
          <div className="space-y-2">
            <div className="text-sm">Status: <span className="font-semibold">{account.status || 'conectado'}</span></div>
            <div className="text-sm">Usuário ML: <span className="font-semibold">{account.nickname || account.ml_user_id}</span></div>
            <div className="text-xs text-gray-500">Expira em: {account.expires_at ? new Date(account.expires_at).toLocaleString('pt-BR') : '—'}</div>
            <div className="mt-3">
              <button className="btn-ghost" onClick={handleDisconnect} disabled={busy}>Desconectar</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-gray-600">Nenhuma conta conectada.</div>
            <button className="btn-primary" onClick={handleConnect} disabled={busy}>Conectar Mercado Livre</button>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Sincronização">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Auto sync a cada ~12 minutos</div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoSync}
              onChange={(e) => {
                const v = e.target.checked;
                setAutoSync(v);
                window.localStorage.setItem('meli_auto_sync', String(v));
              }}
            />
            Ativo
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Envios recentes">
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
              {shipments.map((s) => {
                const p = s.payload || {};
                const deadline =
                  p?.shipping_option?.estimated_handling_limit?.date ??
                  p?.estimated_handling_limit?.date ??
                  p?.date_created ??
                  null;
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
              {!shipments.length ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-gray-500">Nenhum envio encontrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Observações">
        <div className="text-xs text-gray-500">
          As notificações do ML são recebidas via webhook e processadas pelo worker.
        </div>
      </SectionCard>
    </div>
  );
}
