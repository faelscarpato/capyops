import type { Product } from '../../lib/types';
import type { SaleDraftItem } from './types';
import SaleItemRow from './SaleItemRow';

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

        <div className="md:col-span-8 flex items-end justify-end">
          <button type="button" className="btn-primary" onClick={addLine} disabled={products.length === 0}>
            Adicionar item
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="min-w-[820px] w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              <th className="py-3 px-3 text-left">Produto</th>
              <th className="py-3 px-3 text-left w-[120px]">Qtd</th>
              <th className="py-3 px-3 text-left w-[160px]">Preço (un)</th>
              <th className="py-3 px-3 text-left w-[170px]">Embalagem</th>
              <th className="py-3 px-3 text-left w-[70px]" />
            </tr>
          </thead>

          <tbody>
            {items.map((it) => (
              <SaleItemRow
                key={it.id}
                item={it}
                products={products}
                kitCostById={kitCostById}
                onChange={(patch) =>
                  onChangeItems(items.map((x) => (x.id === it.id ? { ...x, ...patch } : x)))
                }
                onRemove={() => onChangeItems(items.filter((x) => x.id !== it.id))}
              />
            ))}
          </tbody>
        </table>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Adicione pelo menos um item para continuar.
        </div>
      ) : null}
    </div>
  );
}
