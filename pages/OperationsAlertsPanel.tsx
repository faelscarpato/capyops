import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import { listCompetitorAlerts } from '../lib/db';
import type { CompetitorTracking } from '../lib/types';

function fmtDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function OperationsAlertsPanel() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CompetitorTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const data = await listCompetitorAlerts(25);
      setRows(data);
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao carregar alertas.');
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
        title="Alertas"
        subtitle="Concorrentes abaixo do preco alvo."
        actions={
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={refresh} disabled={loading}>
              Atualizar
            </button>
            <button
              className="btn-primary"
              type="button"
              onClick={() => navigate('/app/operacoes?tab=competidores')}
            >
              Abrir competidores
            </button>
          </div>
        }
      />

      {err ? <div className="alert alert-error">{err}</div> : null}

      <SectionCard title="Alertas de concorrentes">
        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : rows.length ? (
          <div className="space-y-2">
            {rows.map((c) => (
              <div key={c.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/20">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-gray-900 dark:text-slate-100">
                      {c.competitor_mlb_id}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      Ultima checagem: {fmtDateTime(c.last_checked_at)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-xs text-gray-500 dark:text-slate-400">Preco</div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                      R$ {(c.last_price ?? 0).toFixed(2)}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400">
                      Alvo: R$ {(c.target_price ?? 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">Nenhum alerta ativo.</div>
        )}
      </SectionCard>
    </div>
  );
}
