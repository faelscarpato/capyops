import { useEffect, useState } from 'react';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import { getMeliAccount, getMeliHealthSignals, listMeliShipments } from '../lib/db';
import { meliOAuthStart, meliDisconnect, meliProcessWorker, meliDownloadLabel } from '../lib/meliApi';

type HealthStatus = 'ok' | 'unstable' | 'offline';

function statusFromDate(date: string | null): HealthStatus {
  if (!date) return 'offline';
  const ts = new Date(date).getTime();
  if (!Number.isFinite(ts)) return 'offline';
  const diffHours = (Date.now() - ts) / (1000 * 60 * 60);
  if (diffHours <= 24) return 'ok';
  if (diffHours <= 168) return 'unstable';
  return 'offline';
}

function StatusLed({ status }: { status: HealthStatus }) {
  const map = {
    ok: 'bg-emerald-500 shadow-emerald-500/40',
    unstable: 'bg-amber-500 shadow-amber-500/40',
    offline: 'bg-red-500 shadow-red-500/40'
  };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full shadow ${map[status]} ${status === 'ok' ? 'animate-pulse' : ''}`} />;
}

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
  const [health, setHealth] = useState<any | null>(null);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const acc = await getMeliAccount();
      setAccount(acc);
      const sh = await listMeliShipments(10);
      setShipments(sh);
      const signals = await getMeliHealthSignals();
      setHealth(signals);
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="text-xs text-gray-500">
            As notificações do ML são recebidas via webhook e processadas pelo worker.
          </div>
          <div className="space-y-2 text-xs">
            <div className="font-semibold text-gray-700 dark:text-slate-300">Saúde das APIs</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <StatusLed status={account ? 'ok' : 'offline'} />
                <span>OAuth / Conta (token e usuário)</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusLed status={statusFromDate(health?.items_at ?? null)} />
                <span>Items (catálogo, preço, visitas)</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusLed status={statusFromDate(health?.orders_at ?? null)} />
                <span>Orders (pedidos e pagamentos)</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusLed status={statusFromDate(health?.questions_at ?? null)} />
                <span>Questions (perguntas de clientes)</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusLed status={statusFromDate(health?.messages_at ?? null)} />
                <span>Messages (mensagens)</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusLed status={statusFromDate(health?.shipments_at ?? null)} />
                <span>Shipments (envios e etiquetas)</span>
              </div>
              <div className="flex items-center gap-2">
                <StatusLed status={statusFromDate(health?.feedback_at ?? null)} />
                <span>Feedback (reputação)</span>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
