import { useMemo, useState } from 'react';
import { ListChecks, Plus } from 'lucide-react';
import { Button } from '../../ui/primitives/Button';
import { Badge } from '../../ui/primitives/Badge';

export type TodayTask = {
  id: string;
  task_name: string;
  done: boolean;
};

type Props = {
  loading: boolean;
  tasks: TodayTask[];
  onToggle: (id: string, nextDone: boolean) => Promise<void>;
  onCreate: (taskName: string) => Promise<void>;
};

export default function TodayTasksPanel({ loading, tasks, onToggle, onCreate }: Props) {
  const [filter, setFilter] = useState<'pending' | 'done'>('pending');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.done).length;
    const total = tasks.length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { done, total, pct, pending: total - done };
  }, [tasks]);

  const visible = useMemo(() => {
    return filter === 'pending' ? tasks.filter((t) => !t.done) : tasks.filter((t) => t.done);
  }, [tasks, filter]);

  async function handleCreate() {
    const name = draft.trim();
    if (!name) return;
    try {
      setBusy(true);
      await onCreate(name);
      setDraft('');
      setFilter('pending');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-default bg-surface px-2 py-0.5 text-xs text-muted">
            {stats.done}/{stats.total} concluídas
          </span>
          <ListChecks className="h-4 w-4 text-muted" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={filter === 'pending' ? 'secondary' : 'ghost'}
            onClick={() => setFilter('pending')}
            disabled={loading}
          >
            Pendentes ({stats.pending})
          </Button>
          <Button
            type="button"
            variant={filter === 'done' ? 'secondary' : 'ghost'}
            onClick={() => setFilter('done')}
            disabled={loading}
          >
            Feitas ({stats.done})
          </Button>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">Progresso do dia</div>
        <div className="mt-2 h-2 w-full rounded-full bg-[color:var(--surface-3)]">
          <div className="h-2 rounded-full bg-[color:var(--primary)] transition-all" style={{ width: `${stats.pct}%` }} />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="input flex-1"
          placeholder="Criar tarefa rápida (ex: 'Responder perguntas ML')"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate();
          }}
          disabled={loading || busy}
        />
        <Button type="button" variant="primary" className="inline-flex items-center gap-2" onClick={handleCreate} disabled={loading || busy}>
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-8 rounded-lg bg-[color:var(--surface-3)]" />
          <div className="h-8 rounded-lg bg-[color:var(--surface-3)]" />
          <div className="h-8 rounded-lg bg-[color:var(--surface-3)]" />
        </div>
      ) : visible.length ? (
        <ul className="space-y-2">
          {visible.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2 hover:bg-[color:var(--surface-2)]"
            >
              <label className="flex min-w-0 items-center gap-3">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={(e) => onToggle(t.id, e.currentTarget.checked)}
                  className="h-4 w-4"
                />
                <span className={['truncate text-sm', t.done ? 'text-[color:var(--muted)] line-through' : 'text-[color:var(--text)]'].join(' ')}>
                  {t.task_name}
                </span>
              </label>

              <span
                className="shrink-0"
              >
                <Badge variant={t.done ? 'success' : 'warning'}>{t.done ? 'Feito' : 'Pendente'}</Badge>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-8 text-center text-sm text-[color:var(--muted)]">
          Nenhuma tarefa nesta visualização.
        </div>
      )}
    </div>
  );
}
