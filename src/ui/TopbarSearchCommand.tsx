import { useEffect, useMemo, useRef, useState } from 'react';
import { Command, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTrigger } from './primitives/Dialog';
import { GLOBAL_SEARCH_ITEMS } from './globalSearchIndex';

type TopbarSearchCommandProps = {
  className?: string;
  fullWidth?: boolean;
  placeholder?: string;
};

export default function TopbarSearchCommand({
  className = '',
  fullWidth = false,
  placeholder = 'Buscar...'
}: TopbarSearchCommandProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return GLOBAL_SEARCH_ITEMS.slice(0, 12);
    return GLOBAL_SEARCH_ITEMS.filter((item) => {
      const haystack = [item.label, item.hint ?? '', ...(item.keywords ?? [])].join(' ').toLowerCase();
      return haystack.includes(term);
    }).slice(0, 12);
  }, [query]);

  function openResult(index: number) {
    const target = results[index];
    if (!target) return;
    navigate(target.to);
    setOpen(false);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const hotkey = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (!hotkey) return;
      event.preventDefault();
      setOpen((prev) => !prev);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          className={[
            'inline-flex h-10 items-center justify-between rounded-lg border border-default bg-surface px-3 text-sm text-muted shadow-card transition hover:bg-surface-2',
            fullWidth ? 'w-full' : 'w-full max-w-md',
            className
          ].join(' ')}
          aria-label="Buscar no aplicativo"
        >
          <span className="inline-flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span>{placeholder}</span>
          </span>
          <span className="hidden items-center gap-1 rounded-md border border-default bg-surface-2 px-2 py-0.5 text-[11px] text-muted-2 sm:inline-flex">
            <Command className="h-3 w-3" />
            K
          </span>
        </button>
      </DialogTrigger>

      <DialogContent
        className="max-w-2xl p-0"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
      >
        <div className="border-b border-default px-4 py-3">
          <label className="relative block" aria-label="Buscar rota ou ação">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={(event) => {
                if (!results.length) return;
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActiveIndex((prev) => (prev + 1) % results.length);
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
                }
                if (event.key === 'Enter') {
                  event.preventDefault();
                  openResult(activeIndex);
                }
              }}
              className="input w-full pl-9"
              placeholder="Digite para buscar páginas e ações..."
              autoFocus
            />
          </label>
        </div>

        <div className="max-h-[60vh] overflow-auto p-2">
          {results.length ? (
            <ul className="space-y-1" role="listbox" aria-label="Resultados da busca">
              {results.map((item, index) => (
                <li key={item.id} role="option" aria-selected={index === activeIndex}>
                  <button
                    type="button"
                    className={[
                      'flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition',
                      index === activeIndex
                        ? 'bg-surface-2 text-fg'
                        : 'text-muted hover:bg-surface-2 hover:text-fg'
                    ].join(' ')}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => openResult(index)}
                  >
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-muted-2">{item.hint ?? ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-6 text-sm text-muted">Nenhum resultado encontrado.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
