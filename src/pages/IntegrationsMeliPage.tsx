import { useEffect, useState } from 'react';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import { getMeliAccount } from '../lib/db';
import { meliOAuthStart, meliDisconnect, meliProcessWorker } from '../lib/meliApi';

export default function IntegrationsMeliPage() {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<any | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const acc = await getMeliAccount();
      setAccount(acc);
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

      <SectionCard title="Observações">
        <div className="text-xs text-gray-500">
          As notificações do ML são recebidas via webhook e processadas pelo worker.
        </div>
      </SectionCard>
    </div>
  );
}
