import { useEffect, useState } from 'react';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import { listPendingMlQuestions, listInternalEvents, markInternalEventRead } from '../lib/db';
import type { MlQuestion } from '../lib/types';
import type { InternalEvent } from '../lib/db';

function fmtDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function OperationsPendingPanel() {
  const [questions, setQuestions] = useState<MlQuestion[]>([]);
  const [events, setEvents] = useState<InternalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const [q, ev] = await Promise.all([listPendingMlQuestions(25), listInternalEvents(25)]);
      setQuestions(q);
      setEvents(ev);
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao carregar pendencias.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleMarkRead(id: string) {
    try {
      await markInternalEventRead(id);
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'Falha ao marcar evento como lido.');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pendencias"
        subtitle="Perguntas ML pendentes e eventos internos."
        actions={
          <button className="btn-ghost" onClick={refresh} disabled={loading}>
            Atualizar
          </button>
        }
      />

      {err ? <div className="alert alert-error">{err}</div> : null}

      <SectionCard title="Perguntas ML pendentes">
        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : questions.length ? (
          <div className="space-y-2">
            {questions.map((q) => (
              <div key={q.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/20">
                <div className="font-medium text-gray-900 dark:text-slate-100">{q.question_text}</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  {q.buyer_nickname ? `Cliente: ${q.buyer_nickname} • ` : ''}Recebida: {fmtDateTime(q.received_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">Nenhuma pergunta pendente.</div>
        )}
      </SectionCard>

      <SectionCard title="Eventos internos">
        {loading ? (
          <div className="text-sm text-gray-500">Carregando...</div>
        ) : events.length ? (
          <div className="space-y-2">
            {events.map((ev) => (
              <div key={ev.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-gray-900 dark:text-slate-100">{ev.title ?? 'Evento'}</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">{ev.body ?? 'Atualizacao registrada.'}</div>
                    <div className="mt-1 text-[11px] text-gray-400 dark:text-slate-500">Criado: {fmtDateTime(ev.created_at)}</div>
                  </div>
                  <button className="btn-ghost text-xs" type="button" onClick={() => handleMarkRead(ev.id)}>
                    Marcar como lido
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500">Nenhum evento recente.</div>
        )}
      </SectionCard>
    </div>
  );
}
