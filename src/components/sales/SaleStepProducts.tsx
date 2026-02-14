import type { Product } from '../../lib/types';
import type { SaleDraftItem } from './types';
import SaleItemRow from './SaleItemRow';
import { Button } from '../../ui/primitives/Button';
import { toNumber } from './types';

type Props = {
  products: Product[];
  kitCostById: Record<string, number | undefined>;
  items: SaleDraftItem[];
  onChangeItems: (next: SaleDraftItem[]) => void;
  channel: string;
  onChangeChannel: (channel: string) => void;
};

export default function SaleStepProducts({
  products,
  kitCostById,
  items,
  onChangeItems,
  channel,
  onChangeChannel
}: Props) {
  const productById = new Map(products.map((product) => [product.id, product]));

  const addLine = () => {
    const first = products[0];
    const id = `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
    const next: SaleDraftItem = {
      id,
      productId: first?.id ?? '',
      quantity: 1,
      unitPrice: String(first?.price ?? 0),
      packagingCost: String(first?.packaging_cost ?? 0),
      useAutoPackaging: true,
      applyKitStock: false
    };
    onChangeItems([...items, next]);
  };

  function updateItem(itemId: string, patch: Partial<SaleDraftItem>) {
    onChangeItems(items.map((current) => (current.id === itemId ? { ...current, ...patch } : current)));
  }

  function removeItem(itemId: string) {
    onChangeItems(items.filter((current) => current.id !== itemId));
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="md:col-span-4">
          <div className="label mb-1">Canal</div>
          <select className="input" value={channel} onChange={(e) => onChangeChannel(e.target.value)}>
            <option value="mercado_livre_normal">Mercado Livre (Normal)</option>
            <option value="mercado_livre_full">Mercado Livre (Full)</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="shopee">Shopee</option>
            <option value="outro">Outro</option>
          </select>
        </div>

        <div className="flex items-end justify-end md:col-span-8">
          <Button type="button" variant="primary" onClick={addLine} disabled={products.length === 0}>
            Adicionar item
          </Button>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {items.map((item) => {
          const selected = productById.get(item.productId) ?? null;
          const kitCost =
            selected?.packing_kit_id && kitCostById[selected.packing_kit_id] != null
              ? Number(kitCostById[selected.packing_kit_id])
              : null;
          const autoPackaging =
            selected?.packaging_cost != null ? Number(selected.packaging_cost) : kitCost != null ? kitCost : 0;

          return (
            <div key={item.id} className="rounded-lg border border-default bg-surface p-3 shadow-card">
              <div className="space-y-3">
                <div>
                  <div className="label mb-1">Produto</div>
                  <select
                    className="input"
                    value={item.productId}
                    onChange={(event) =>
                      updateItem(item.id, {
                        productId: event.target.value,
                        unitPrice: String((productById.get(event.target.value)?.price ?? 0) || 0),
                        useAutoPackaging: true
                      })
                    }
                  >
                    <option value="" disabled>
                      Selecione um produto
                    </option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} {product.size_cm ? `${product.size_cm}cm` : ''} • {product.variant} (Estoque: {product.stock})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="label">Qtd</span>
                    <input
                      className="input"
                      inputMode="numeric"
                      value={String(item.quantity)}
                      onChange={(event) => updateItem(item.id, { quantity: Math.max(1, Math.trunc(toNumber(event.target.value))) })}
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="label">Preço (un)</span>
                    <input
                      className="input"
                      inputMode="decimal"
                      value={item.unitPrice}
                      onChange={(event) => updateItem(item.id, { unitPrice: event.target.value })}
                    />
                  </label>
                </div>

                <label className="space-y-1">
                  <span className="label">Embalagem</span>
                  <input
                    className="input"
                    inputMode="decimal"
                    value={item.useAutoPackaging ? String(autoPackaging) : item.packagingCost}
                    onChange={(event) => updateItem(item.id, { packagingCost: event.target.value })}
                    disabled={item.useAutoPackaging}
                    placeholder="0"
                  />
                </label>

                {selected?.packing_kit_id ? (
                  <div className="space-y-2 text-xs text-muted">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={item.useAutoPackaging}
                        onChange={(event) => updateItem(item.id, { useAutoPackaging: event.target.checked })}
                      />
                      <span>Auto embalagem</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={item.applyKitStock}
                        onChange={(event) => updateItem(item.id, { applyKitStock: event.target.checked })}
                      />
                      <span>Abater insumos do kit</span>
                    </label>

                    <div>Ref kit: {kitCost == null ? '...' : kitCost.toFixed(2)}</div>
                  </div>
                ) : null}

                <Button type="button" variant="ghost" className="w-full" onClick={() => removeItem(item.id)}>
                  Remover item
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden rounded-xl border border-default bg-surface md:block">
        <div className="table-scroll">
          <table className="table-base w-full min-w-[820px] text-sm">
            <thead className="bg-surface-2 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-3 text-left">Produto</th>
                <th className="w-[120px] px-3 py-3 text-left">Qtd</th>
                <th className="w-[160px] px-3 py-3 text-left">Preço (un)</th>
                <th className="w-[170px] px-3 py-3 text-left">Embalagem</th>
                <th className="w-[70px] px-3 py-3 text-left" />
              </tr>
            </thead>

            <tbody>
              {items.map((it) => (
                <SaleItemRow
                  key={it.id}
                  item={it}
                  products={products}
                  kitCostById={kitCostById}
                  onChange={(patch) => updateItem(it.id, patch)}
                  onRemove={() => removeItem(it.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card p-4 text-sm text-muted">
          Adicione pelo menos um item para continuar.
        </div>
      ) : null}
    </div>
  );
}


