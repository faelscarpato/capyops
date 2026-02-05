import type { Product } from '../../lib/types';
import type { SaleDraftItem } from './types';
import { toNumber } from './types';

type Props = {
  item: SaleDraftItem;
  products: Product[];
  kitCostById: Record<string, number | undefined>;
  onChange: (patch: Partial<SaleDraftItem>) => void;
  onRemove: () => void;
};

export default function SaleItemRow({ item, products, kitCostById, onChange, onRemove }: Props) {
  const selected = products.find((p) => p.id === item.productId) ?? null;

  const kitCost =
    selected?.packing_kit_id && kitCostById[selected.packing_kit_id] != null
      ? Number(kitCostById[selected.packing_kit_id])
      : null;

  const autoPackaging =
    selected?.packaging_cost != null
      ? Number(selected.packaging_cost)
      : kitCost != null
        ? kitCost
        : 0;

  const resolvedPackaging = item.useAutoPackaging ? autoPackaging : toNumber(item.packagingCost);

  return (
    <tr className="border-b border-gray-100 dark:border-slate-800">
      <td className="py-2 pr-2 align-top">
        <select
          className="input"
          value={item.productId}
          onChange={(e) =>
            onChange({
              productId: e.target.value,
              unitPrice: String((products.find((p) => p.id === e.target.value)?.price ?? 0) || 0),
              useAutoPackaging: true
            })
          }
        >
          <option value="" disabled>
            Selecione um produto
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.size_cm ? `${p.size_cm}cm` : ''} • {p.variant} (Estoque: {p.stock})
            </option>
          ))}
        </select>

        {selected?.packing_kit_id ? (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-slate-400">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={item.useAutoPackaging}
                onChange={(e) => onChange({ useAutoPackaging: e.target.checked })}
              />
              Auto embalagem
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={item.applyKitStock}
                onChange={(e) => onChange({ applyKitStock: e.target.checked })}
              />
              Abater insumos do kit
            </label>

            <span>Ref kit: {kitCost == null ? '...' : kitCost.toFixed(2)}</span>
          </div>
        ) : null}
      </td>

      <td className="py-2 pr-2 align-top w-[120px]">
        <input
          className="input"
          inputMode="numeric"
          value={String(item.quantity)}
          onChange={(e) => onChange({ quantity: Math.max(1, Math.trunc(toNumber(e.target.value))) })}
        />
      </td>

      <td className="py-2 pr-2 align-top w-[160px]">
        <input
          className="input"
          inputMode="decimal"
          value={item.unitPrice}
          onChange={(e) => onChange({ unitPrice: e.target.value })}
        />
        <div className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
          Base: {selected ? selected.cost.toFixed(2) : '0.00'}
        </div>
      </td>

      <td className="py-2 pr-2 align-top w-[170px]">
        <input
          className="input"
          inputMode="decimal"
          value={item.useAutoPackaging ? String(autoPackaging) : item.packagingCost}
          onChange={(e) => onChange({ packagingCost: e.target.value })}
          disabled={item.useAutoPackaging}
          placeholder="0"
        />
        <div className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
          Embalagem usada: {resolvedPackaging.toFixed(2)}
        </div>
      </td>

      <td className="py-2 align-top w-[70px]">
        <button type="button" className="btn-ghost w-full" onClick={onRemove}>
          Remover
        </button>
      </td>
    </tr>
  );
}
