import type { ReactNode } from 'react';
import { Filter, Search } from 'lucide-react';
import { Button } from './primitives/Button';
import { Input } from './primitives/Input';

type DataToolbarProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  primaryAction?: ReactNode;
  filterAction?: ReactNode;
  sortAction?: ReactNode;
  extraActions?: ReactNode;
};

export default function DataToolbar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  primaryAction,
  filterAction,
  sortAction,
  extraActions
}: DataToolbarProps) {
  const canSearch = typeof onSearchChange === 'function';

  return (
    <div className="data-toolbar">
      <div className="data-toolbar-main">
        {canSearch ? (
          <label className="relative w-full md:max-w-md" aria-label="Busca da lista">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-2" />
            <Input
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9"
            />
          </label>
        ) : null}

        {filterAction === undefined ? (
          <Button type="button" variant="ghost">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        ) : filterAction}

        {sortAction}
      </div>

      <div className="data-toolbar-actions">
        {extraActions}
        {primaryAction}
      </div>
    </div>
  );
}
