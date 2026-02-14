import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Crosshair, MessageCircle, ChevronRight, Link2 } from 'lucide-react';
import {
  getCompetitorAlertCount,
  getPendingMlQuestionsCount,
  listCompetitorAlerts,
  listPendingMlQuestions,
  getUnreadInternalEventsCount,
  listInternalEvents,
  markInternalEventRead
} from '../lib/db';
import { queryKeys } from '../lib/queryKeys';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Popover, PopoverContent, PopoverTrigger } from './primitives/Popover';
import { Button } from './primitives/Button';

function fmtDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

async function fetchAlertCounts() {
  const [pendingCount, competitorCount, eventsCount] = await Promise.all([
    getPendingMlQuestionsCount(),
    getCompetitorAlertCount(),
    getUnreadInternalEventsCount()
  ]);
  return { pendingCount, competitorCount, eventsCount };
}

async function fetchAlertPreview() {
  const [pendingQuestions, competitorAlerts, events] = await Promise.all([
    listPendingMlQuestions(5),
    listCompetitorAlerts(5),
    listInternalEvents(5, { unreadOnly: true })
  ]);
  return { pendingQuestions, competitorAlerts, events };
}

export default function AlertsPopover() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const countsQuery = useQuery({
    queryKey: queryKeys.alertsCounts,
    queryFn: fetchAlertCounts,
    refetchInterval: 20_000
  });

  const previewQuery = useQuery({
    queryKey: queryKeys.alertsPreview,
    queryFn: fetchAlertPreview,
    enabled: open
  });

  const markReadMutation = useMutation({
    mutationFn: (eventId: string) => markInternalEventRead(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alertsCounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.alertsPreview });
    }
  });

  const counts = countsQuery.data ?? { pendingCount: 0, competitorCount: 0, eventsCount: 0 };
  const preview = previewQuery.data ?? { pendingQuestions: [], competitorAlerts: [], events: [] };

  const total = useMemo(
    () => counts.pendingCount + counts.competitorCount + counts.eventsCount,
    [counts.pendingCount, counts.competitorCount, counts.eventsCount]
  );

  useEffect(() => {
    const channel = supabase
      .channel('events-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.alertsCounts });
        queryClient.invalidateQueries({ queryKey: queryKeys.alertsPreview });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const hasError = countsQuery.error || previewQuery.error;
  const errorMessage = hasError instanceof Error ? hasError.message : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-default bg-surface text-fg shadow-card hover:bg-surface-2"
          aria-label="Abrir alertas"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <Bell className="h-4 w-4" />
          {total > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-[color:var(--danger)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {total > 99 ? '99+' : total}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[380px] max-w-[90vw] p-0">
        <div className="flex items-center justify-between border-b border-default px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-fg">Alertas</div>
            <div className="text-xs text-muted">
              {countsQuery.isFetching || previewQuery.isFetching ? 'Atualizando…' : `${total} pendências ativas`}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => {
            countsQuery.refetch();
            previewQuery.refetch();
          }}>
            Atualizar
          </Button>
        </div>

        {errorMessage ? <div className="px-4 py-3 text-sm text-[color:var(--danger)]">{errorMessage}</div> : null}

        <div className="max-h-[420px] overflow-auto">
          <div className="px-4 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <MessageCircle className="h-4 w-4" />
                Perguntas ML
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--primary)] hover:underline"
                onClick={() => {
                  setOpen(false);
                  navigate('/perguntas');
                }}
              >
                Abrir <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {preview.pendingQuestions.length ? (
              <div className="space-y-2">
                {preview.pendingQuestions.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-left text-sm hover:bg-surface-2"
                    onClick={() => {
                      setOpen(false);
                      navigate('/perguntas');
                    }}
                  >
                    <div className="truncate font-medium text-fg" title={q.question_text}>{q.question_text}</div>
                    <div className="mt-1 text-xs text-muted">
                      {q.buyer_nickname ? `Cliente: ${q.buyer_nickname} • ` : ''}Recebida: {fmtDateTime(q.received_at)}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-default px-3 py-3 text-sm text-muted">
                {counts.pendingCount > 0 ? 'Carregando prévia…' : 'Nenhuma pergunta pendente.'}
              </div>
            )}
          </div>

          <div className="px-4 pb-4 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <Crosshair className="h-4 w-4" />
                Concorrentes
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--primary)] hover:underline"
                onClick={() => {
                  setOpen(false);
                  navigate('/competidores');
                }}
              >
                Abrir <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {preview.competitorAlerts.length ? (
              <div className="space-y-2">
                {preview.competitorAlerts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-left text-sm hover:bg-surface-2"
                    onClick={() => {
                      setOpen(false);
                      navigate('/competidores');
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-fg">{c.competitor_mlb_id}</div>
                        <div className="mt-1 text-xs text-muted">Última checagem: {fmtDateTime(c.last_checked_at)}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-xs text-muted">Preço</div>
                        <div className="text-sm font-semibold text-fg">R$ {(c.last_price ?? 0).toFixed(2)}</div>
                        <div className="text-[11px] text-muted">Alvo: R$ {(c.target_price ?? 0).toFixed(2)}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-default px-3 py-3 text-sm text-muted">
                {counts.competitorCount > 0 ? 'Carregando prévia…' : 'Nenhum alerta de concorrente.'}
              </div>
            )}
          </div>

          <div className="px-4 pb-4 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                <Link2 className="h-4 w-4" />
                Mercado Livre
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--primary)] hover:underline"
                onClick={() => {
                  setOpen(false);
                  navigate('/integracoes/mercado-livre');
                }}
              >
                Ver integração <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            {preview.events.length ? (
              <div className="space-y-2">
                {preview.events.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-left text-sm hover:bg-surface-2"
                    onClick={async () => {
                      await markReadMutation.mutateAsync(ev.id);
                      setOpen(false);
                      navigate('/integracoes/mercado-livre');
                    }}
                  >
                    <div className="truncate font-medium text-fg">{ev.title ?? 'Evento ML'}</div>
                    <div className="mt-1 text-xs text-muted">{ev.body ?? 'Nova atualização'}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-default px-3 py-3 text-sm text-muted">
                Nenhum evento recente.
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-default px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setOpen(false);
              navigate('/plano-marketing');
            }}
          >
            Plano Mkt + Operação
          </Button>
          <Button variant="primary" size="sm" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
