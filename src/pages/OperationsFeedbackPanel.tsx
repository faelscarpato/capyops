import { useEffect, useState } from 'react';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import { listMeliFeedback } from '../lib/db';
import type { MeliFeedback } from '../lib/types';

function fmtDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function getFeedbackSummary(payload: any): string {
  if (!payload) return 'Feedback recebido';
  return (
    payload.message ||
    payload?.feedback?.message ||
    payload?.reason ||
    payload?.rating ||
    'Feedback recebido'
  );
}

function getFeedbackFrom(payload: any): string {
  if (!payload) return '—';
  return (
    payload?.from?.nickname ||
    payload?.from?.user_id ||
    payload?.buyer?.nickname ||
    payload?.author_id ||
    '—'
  );
}

export default function OperationsFeedbackPanel() {
  const [rows, setRows] = useState<MeliFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const data = await listMeliFeedback(50);
      setRows(data);
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao carregar feedback.');
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
        title="Feedback"
        subtitle="Reputacao e feedbacks do Mercado Livre."
        actions={
          <button className="btn-ghost" onClick={refresh} disabled={loading}>
            Atualizar
          </button>
        }
      />

      {err ? <div className="alert alert-error">{err}</div> : null}

      <SectionCard title="Feedbacks recentes">
        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : rows.length ? (
          <div className="space-y-2">
            {rows.map((f) => (
              <div key={f.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-gray-900 dark:text-slate-100">
                      {getFeedbackFrom(f.payload)}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      {getFeedbackSummary(f.payload)}
                    </div>
                  </div>
                  <div className="shrink-0 text-[11px] text-gray-400 dark:text-slate-500">
                    {fmtDateTime(f.updated_at ?? f.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">Nenhum feedback encontrado.</div>
        )}
      </SectionCard>
    </div>
  );
}
