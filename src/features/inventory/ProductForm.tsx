import { useMemo } from 'react';
import type { Product } from '../../lib/types';
export type ProductDraft = Omit<Product, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

type Props = {
  title: string;
  draft: ProductDraft;
  onChange: (next: ProductDraft) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  packingKits?: { id: string; name: string; cost?: number }[];
};

function toNumberOrNull(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function ProductForm({
  title,
  draft,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting,
  packingKits
}: Props) {
  const canSubmit = useMemo(() => {
    if (!draft.name.trim()) return false;
    if (!draft.variant.trim()) return false;
    if (!Number.isFinite(draft.cost)) return false;
    if (!Number.isFinite(draft.stock)) return false;
    if (!Number.isFinite(draft.min_stock)) return false;
    return true;
  }, [draft]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</div>
        <div className="text-xs text-gray-500 dark:text-slate-400">
          Campos extras (categoria, fornecedor, lead time, ID do anúncio) habilitam filtros e integração leve com ML.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Nome</span>
          <input
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.currentTarget.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="Ex.: São Miguel Arcanjo"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Variante</span>
          <input
            value={draft.variant}
            onChange={(e) => onChange({ ...draft, variant: e.currentTarget.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="Branco / Sombreado"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Tamanho (cm)</span>
          <input
            value={draft.size_cm ?? ''}
            onChange={(e) => onChange({ ...draft, size_cm: toNumberOrNull(e.currentTarget.value) })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="20"
            inputMode="decimal"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-700 dark:text-slate-300">SKU (opcional)</span>
          <input
            value={draft.sku ?? ''}
            onChange={(e) => onChange({ ...draft, sku: e.currentTarget.value || null })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="SKU interno"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Categoria</span>
          <input
            value={draft.category ?? ''}
            onChange={(e) => onChange({ ...draft, category: e.currentTarget.value || null })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="Santos / Decor / Embalagem"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Material</span>
          <input
            value={draft.material}
            onChange={(e) => onChange({ ...draft, material: e.currentTarget.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="Resina"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Fornecedor</span>
          <input
            value={draft.supplier_name ?? ''}
            onChange={(e) => onChange({ ...draft, supplier_name: e.currentTarget.value || null })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="Ex.: Minha Nossa Bela"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Lead time (dias)</span>
          <input
            value={draft.lead_time_days ?? ''}
            onChange={(e) => onChange({ ...draft, lead_time_days: toNumberOrNull(e.currentTarget.value) })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="3"
            inputMode="numeric"
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-medium text-gray-700 dark:text-slate-300">ID do anúncio (ML)</span>
          <input
            value={draft.ml_listing_id ?? ''}
            onChange={(e) => onChange({ ...draft, ml_listing_id: e.currentTarget.value || null })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="MLB123456789"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Custo (R$)</span>
          <input
            value={draft.cost}
            onChange={(e) => onChange({ ...draft, cost: Number(e.currentTarget.value) || 0 })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            inputMode="decimal"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Preço base (R$)</span>
          <input
            value={draft.price}
            onChange={(e) => onChange({ ...draft, price: Number(e.currentTarget.value) || 0 })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            inputMode="decimal"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Estoque</span>
          <input
            value={draft.stock}
            onChange={(e) => onChange({ ...draft, stock: Number(e.currentTarget.value) || 0 })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            inputMode="numeric"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Estoque mínimo</span>
          <input
            value={draft.min_stock}
            onChange={(e) => onChange({ ...draft, min_stock: Number(e.currentTarget.value) || 0 })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            inputMode="numeric"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Ativo</span>
          <select
            value={draft.is_active ? '1' : '0'}
            onChange={(e) => onChange({ ...draft, is_active: e.currentTarget.value === '1' })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="1">Ativo</option>
            <option value="0">Inativo</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Kit de embalagem</span>
          <select
            value={draft.packing_kit_id ?? ''}
            onChange={(e) => onChange({ ...draft, packing_kit_id: e.currentTarget.value || null })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">Sem kit</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Custo embalagem (override)</span>
          <input
            value={draft.packaging_cost ?? ''}
            onChange={(e) => onChange({ ...draft, packaging_cost: toNumberOrNull(e.currentTarget.value) })}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            inputMode="decimal"
            placeholder="Deixe vazio para usar o kit"
          />
        </label>

        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Observações</span>
          <textarea
            value={draft.notes ?? ''}
            onChange={(e) => onChange({ ...draft, notes: e.currentTarget.value || null })}
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          {onCancel ? (
            <button type="button" className="btn-ghost" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </div>
  );
}
