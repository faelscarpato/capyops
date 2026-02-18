import { SendHorizonal } from 'lucide-react';
import Card from './Card';

const MESSAGES = [
  { id: 1, role: 'assistant', content: 'Revenue is up 8.4% versus last week.' },
  { id: 2, role: 'user', content: 'Show risk areas for this week.' },
  { id: 3, role: 'assistant', content: 'Returns and delayed shipments need attention.' }
];

export default function RightPanelChat() {
  return (
    <Card title="Copilot" subtitle="Ask about your data">
      <div className="space-y-3">
        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {MESSAGES.map((message) => (
            <div
              key={message.id}
              className={[
                'max-w-[90%] rounded-[var(--radius-md)] px-3 py-2 text-xs',
                message.role === 'assistant'
                  ? 'bg-[var(--surface-2)] text-[var(--text)]'
                  : 'ml-auto bg-[var(--primary)] text-white'
              ].join(' ')}
            >
              {message.content}
            </div>
          ))}
        </div>
        <form className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask about your data"
            className="h-10 w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-[var(--primary)]/35"
          />
          <button
            type="submit"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-white transition hover:bg-[var(--primary-3)]"
            aria-label="Send"
          >
            <SendHorizonal className="h-4 w-4" />
          </button>
        </form>
      </div>
    </Card>
  );
}
