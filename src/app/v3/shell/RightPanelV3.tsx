import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import TodayTasksPanel from '../../../components/tasks/TodayTasksPanel';
import { createTodayTask, ensureTodayTasks, getTodayTasks, setTaskDone } from '../../../lib/db';

type RightPanelV3Props = {
  open: boolean;
  onClose: () => void;
  variant?: 'desktop' | 'overlay';
};

const DEFAULT_TASKS = [
  'Ver pedidos pagos',
  'Separar produtos',
  'Embalar',
  'Postar pedidos',
  'Enviar msg automática',
  'Atualizar estoque'
];

function PanelBody({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ['tasks', 'today'],
    queryFn: async () => {
      await ensureTodayTasks(DEFAULT_TASKS);
      return getTodayTasks();
    }
  });

  const toggleTaskMutation = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => setTaskDone(id, done),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', 'today'] })
  });

  const createTaskMutation = useMutation({
    mutationFn: (taskName: string) => createTodayTask(taskName),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', 'today'] })
  });

  return (
    <div className="flex h-full flex-col bg-[var(--surface)]">
      <div className="flex h-[72px] items-center justify-between border-b border-[var(--border)] px-4">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">Tasks Drawer</p>
          <p className="text-xs text-[var(--muted)]">Checklist operacional do dia</p>
        </div>
        <button
          type="button"
          className="rounded-md p-1 text-[var(--muted)] hover:bg-[var(--surface-2)]"
          onClick={onClose}
          aria-label="Fechar painel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <TodayTasksPanel
          loading={tasksQuery.isPending}
          tasks={tasksQuery.data ?? []}
          onToggle={async (id, done) => {
            await toggleTaskMutation.mutateAsync({ id, done });
          }}
          onCreate={async (taskName) => {
            await createTaskMutation.mutateAsync(taskName);
          }}
        />
      </div>
    </div>
  );
}

export default function RightPanelV3({ open, onClose, variant = 'overlay' }: RightPanelV3Props) {
  if (!open) return null;

  if (variant === 'desktop') {
    return (
      <aside className="hidden h-full w-[380px] border-l border-[var(--border)] bg-[var(--surface)] lg:flex lg:flex-col">
        <PanelBody onClose={onClose} />
      </aside>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Fechar painel"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/45"
      />
      <aside className="fixed right-0 top-0 z-50 h-full w-[min(100%,380px)] border-l border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
        <PanelBody onClose={onClose} />
      </aside>
    </>
  );
}
