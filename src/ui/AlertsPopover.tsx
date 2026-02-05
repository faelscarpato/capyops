import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Crosshair, MessageCircle, ChevronRight, Link2 } from 'lucide-react';
import { getCompetitorAlertCount, getPendingMlQuestionsCount, listCompetitorAlerts, listPendingMlQuestions, getUnreadInternalEventsCount, listInternalEvents, markInternalEventRead } from '../lib/db';
import type { CompetitorTracking, MlQuestion } from '../lib/types';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function fmtDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AlertsPopover() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState<MlQuestion[]>([]);
  const [competitorAlerts, setCompetitorAlerts] = useState<CompetitorTracking[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [competitorCount, setCompetitorCount] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);

  const total = useMemo(() => pendingCount + competitorCount + eventsCount, [pendingCount, competitorCount, eventsCount]);

  async function refresh(preview: boolean) {
    setErr(null);
    setLoading(true);
    try {
      const [qCount, cCount, eCount] = await Promise.all([getPendingMlQuestionsCount(), getCompetitorAlertCount(), getUnreadInternalEventsCount()]);
      setPendingCount(qCount);
      setCompetitorCount(cCount);
      setEventsCount(eCount);

      if (preview) {
        const [q, c, ev] = await Promise.all([listPendingMlQuestions(5), listCompetitorAlerts(5), listInternalEvents(5)]);
        setPendingQuestions(q);
        setCompetitorAlerts(c);
        setEvents(ev);
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar alertas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Atualiza o badge sempre, sem depender do popover.
    refresh(false);
    const t = window.setInterval(() => refresh(false), 20000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('events-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => refresh(false))
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    refresh(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (rootRef.current && !rootRef.current.contains(target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-soft hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        aria-label="Alertas"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-4 w-4" />
        {total > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {total > 99 ? '99+' : total}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[90vw] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-slate-800">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Alertas</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">
                {loading ? 'Atualizando…' : `${total} pendências ativas`}
              </div>
            </div>
            <button type="button" className="btn-ghost" onClick={() => refresh(true)} disabled={loading}>
              Atualizar
            </button>
          </div>

          {err ? (
            <div className="px-4 py-3 text-sm text-red-600 dark:text-red-200">{err}</div>
          ) : null}

          <div className="max-h-[420px] overflow-auto">
            {/* Perguntas */}
            <div className="px-4 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  <MessageCircle className="h-4 w-4" />
                  Perguntas ML
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline dark:text-cyan-300"
                  onClick={() => {
                    setOpen(false);
                    navigate('/perguntas');
                  }}
                >
                  Abrir <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              {pendingQuestions.length ? (
                <div className="space-y-2">
                  {pendingQuestions.map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-950/20 dark:hover:bg-slate-800"
                      onClick={() => {
                        setOpen(false);
                        navigate('/perguntas');
                      }}
                    >
                      <div
                        className="truncate font-medium text-gray-900 dark:text-slate-100"
                        title={q.question_text}
                      >
                        {q.question_text}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                        {q.buyer_nickname ? `Cliente: ${q.buyer_nickname} • ` : ''}Recebida: {fmtDateTime(q.received_at)}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 px-3 py-3 text-sm text-gray-500 dark:border-slate-800 dark:text-slate-400">
                  {pendingCount > 0 ? 'Carregando prévia…' : 'Nenhuma pergunta pendente.'}
                </div>
              )}
            </div>

            {/* Concorrentes */}
            <div className="px-4 pb-4 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  <Crosshair className="h-4 w-4" />
                  Concorrentes
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline dark:text-cyan-300"
                  onClick={() => {
                    setOpen(false);
                    navigate('/competidores');
                  }}
                >
                  Abrir <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              {competitorAlerts.length ? (
                <div className="space-y-2">
                  {competitorAlerts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-950/20 dark:hover:bg-slate-800"
                      onClick={() => {
                        setOpen(false);
                        navigate('/competidores');
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-gray-900 dark:text-slate-100">
                            {c.competitor_mlb_id}
                          </div>
                          <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                            Última checagem: {fmtDateTime(c.last_checked_at)}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs text-gray-500 dark:text-slate-400">Preço</div>
                          <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                            R$ {(c.last_price ?? 0).toFixed(2)}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-slate-400">
                            Alvo: R$ {(c.target_price ?? 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 px-3 py-3 text-sm text-gray-500 dark:border-slate-800 dark:text-slate-400">
                  {competitorCount > 0 ? 'Carregando prévia…' : 'Nenhum alerta de concorrente.'}
                </div>
              )}
            </div>

            {/* Eventos ML */}
            <div className="px-4 pb-4 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  <Link2 className="h-4 w-4" />
                  Mercado Livre
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline dark:text-cyan-300"
                  onClick={() => {
                    setOpen(false);
                    navigate('/integracoes/mercado-livre');
                  }}
                >
                  Ver integração <ChevronRight className="h-3 w-3" />
                </button>
              </div>

              {events.length ? (
                <div className="space-y-2">
                  {events.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-950/20 dark:hover:bg-slate-800"
                      onClick={async () => {
                        setOpen(false);
                        await markInternalEventRead(ev.id);
                        navigate('/integracoes/mercado-livre');
                      }}
                    >
                      <div className="truncate font-medium text-gray-900 dark:text-slate-100">{ev.title ?? 'Evento ML'}</div>
                      <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">{ev.body ?? 'Nova atualização'}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-gray-200 px-3 py-3 text-sm text-gray-500 dark:border-slate-800 dark:text-slate-400">
                  Nenhum evento recente.
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 dark:border-slate-800">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setOpen(false);
                navigate('/plano-marketing');
              }}
            >
              Plano Mkt + Operação
            </button>
            <button type="button" className="btn-primary" onClick={() => setOpen(false)}>
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
