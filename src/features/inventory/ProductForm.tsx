import { useMemo } from 'react';
import type { Product } from '../../lib/types';
import { Button } from '../../ui/primitives/Button';
import { Input } from '../../ui/primitives/Input';
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
        <div className="text-sm font-semibold text-fg">{title}</div>
        <div className="text-xs text-muted">
          Campos extras (categoria, fornecedor, lead time, ID do anúncio) habilitam filtros e integração leve com ML.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Input label="Nome" value={draft.name} onChange={(e) => onChange({ ...draft, name: e.currentTarget.value })} placeholder="Ex.: São Miguel Arcanjo" />

        <Input label="Variante" value={draft.variant} onChange={(e) => onChange({ ...draft, variant: e.currentTarget.value })} placeholder="Branco / Sombreado" />

        <Input label="Tamanho (cm)" value={draft.size_cm ?? ''} onChange={(e) => onChange({ ...draft, size_cm: toNumberOrNull(e.currentTarget.value) })} placeholder="20" inputMode="decimal" />

        <Input label="SKU (opcional)" value={draft.sku ?? ''} onChange={(e) => onChange({ ...draft, sku: e.currentTarget.value || null })} placeholder="SKU interno" />

        <Input label="Categoria" value={draft.category ?? ''} onChange={(e) => onChange({ ...draft, category: e.currentTarget.value || null })} placeholder="Santos / Decor / Embalagem" />

        <Input label="Material" value={draft.material} onChange={(e) => onChange({ ...draft, material: e.currentTarget.value })} placeholder="Resina" />

        <Input label="Fornecedor" value={draft.supplier_name ?? ''} onChange={(e) => onChange({ ...draft, supplier_name: e.currentTarget.value || null })} placeholder="Ex.: Minha Nossa Bela" />

        <Input label="Lead time (dias)" value={draft.lead_time_days ?? ''} onChange={(e) => onChange({ ...draft, lead_time_days: toNumberOrNull(e.currentTarget.value) })} placeholder="3" inputMode="numeric" />

        <div className="md:col-span-2">
          <Input
            label="ID do anúncio (ML)"
            value={draft.ml_listing_id ?? ''}
            onChange={(e) => onChange({ ...draft, ml_listing_id: e.currentTarget.value || null })}
            placeholder="MLB123456789"
          />
        </div>

        <Input label="Custo (R$)" value={draft.cost} onChange={(e) => onChange({ ...draft, cost: Number(e.currentTarget.value) || 0 })} inputMode="decimal" />

        <Input label="Preço base (R$)" value={draft.price} onChange={(e) => onChange({ ...draft, price: Number(e.currentTarget.value) || 0 })} inputMode="decimal" />

        <Input label="Estoque" value={draft.stock} onChange={(e) => onChange({ ...draft, stock: Number(e.currentTarget.value) || 0 })} inputMode="numeric" />

        <Input label="Estoque mínimo" value={draft.min_stock} onChange={(e) => onChange({ ...draft, min_stock: Number(e.currentTarget.value) || 0 })} inputMode="numeric" />

        <label className="space-y-1">
          <span className="label">Ativo</span>
          <select
            value={draft.is_active ? '1' : '0'}
            onChange={(e) => onChange({ ...draft, is_active: e.currentTarget.value === '1' })}
            className="input"
          >
            <option value="1">Ativo</option>
            <option value="0">Inativo</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="label">Kit de embalagem</span>
          <select
            value={draft.packing_kit_id ?? ''}
            onChange={(e) => onChange({ ...draft, packing_kit_id: e.currentTarget.value || null })}
            className="input"
          >
            <option value="">Sem kit</option>
            {(packingKits ?? []).map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </label>

        <Input label="Custo embalagem (override)" value={draft.packaging_cost ?? ''} onChange={(e) => onChange({ ...draft, packaging_cost: toNumberOrNull(e.currentTarget.value) })} inputMode="decimal" placeholder="Deixe vazio para usar o kit" />

        <label className="space-y-1 md:col-span-2">
          <span className="label">Observações</span>
          <textarea
            value={draft.notes ?? ''}
            onChange={(e) => onChange({ ...draft, notes: e.currentTarget.value || null })}
            rows={3}
            className="input"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          {onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
          ) : null}
        </div>
        <Button
          type="button"
          variant="primary"
          onClick={onSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </div>
  );
}

