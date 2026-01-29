import { useMemo, useState } from 'react';
import { ListChecks, Plus } from 'lucide-react';

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
          <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {stats.done}/{stats.total} concluídas
          </span>
          <ListChecks className="h-4 w-4 text-gray-500 dark:text-slate-400" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={['btn-ghost', filter === 'pending' ? 'ring-1 ring-blue-500/30 dark:ring-cyan-400/20' : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => setFilter('pending')}
            disabled={loading}
          >
            Pendentes ({stats.pending})
          </button>
          <button
            type="button"
            className={['btn-ghost', filter === 'done' ? 'ring-1 ring-blue-500/30 dark:ring-cyan-400/20' : '']
              .filter(Boolean)
              .join(' ')}
            onClick={() => setFilter('done')}
            disabled={loading}
          >
            Feitas ({stats.done})
          </button>
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Progresso do dia</div>
        <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-slate-800">
          <div className="h-2 rounded-full bg-cyan-500 transition-all" style={{ width: `${stats.pct}%` }} />
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
        <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={handleCreate} disabled={loading || busy}>
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-8 rounded-lg bg-gray-200 dark:bg-slate-800" />
          <div className="h-8 rounded-lg bg-gray-200 dark:bg-slate-800" />
          <div className="h-8 rounded-lg bg-gray-200 dark:bg-slate-800" />
        </div>
      ) : visible.length ? (
        <ul className="space-y-2">
          {visible.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-white px-3 py-2 hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-950"
            >
              <label className="flex min-w-0 items-center gap-3">
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={(e) => onToggle(t.id, e.currentTarget.checked)}
                  className="h-4 w-4"
                />
                <span className={['truncate text-sm', t.done ? 'text-gray-500 line-through dark:text-slate-400' : 'text-gray-900 dark:text-slate-100'].join(' ')}>
                  {t.task_name}
                </span>
              </label>

              <span
                className={[
                  'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                  t.done
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-200'
                    : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-200'
                ].join(' ')}
              >
                {t.done ? 'Feito' : 'Pendente'}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-8 text-center text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Nenhuma tarefa nesta visualização.
        </div>
      )}
    </div>
  );
}
