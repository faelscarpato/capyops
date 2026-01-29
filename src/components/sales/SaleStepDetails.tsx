import { useMemo } from 'react';
import type { Product } from '../../lib/types';
import type { PricingSettings } from '../../hooks/usePricingSettings';
import { calculatePrice } from '../../lib/pricing';
import type { SaleDraftItem } from './types';
import { fmtBRL, toNumber } from './types';

type Props = {
  products: Product[];
  kitCostById: Record<string, number | undefined>;
  items: SaleDraftItem[];
  channel: string;
  region: string;
  onChangeRegion: (region: string) => void;
  shippingCost: string;
  onChangeShippingCost: (v: string) => void;
  shippingPaidByStore: boolean;
  onChangeShippingPaidByStore: (v: boolean) => void;
  registerShippingExpense: boolean;
  onChangeRegisterShippingExpense: (v: boolean) => void;
  discount: string;
  onChangeDiscount: (v: string) => void;
  notes: string;
  onChangeNotes: (v: string) => void;
  pricingSettings: PricingSettings;
  onApplySuggestedUnitPrice: (itemId: string, suggested: number) => void;
};

export default function SaleStepDetails({
  products,
  kitCostById,
  items,
  channel,
  region,
  onChangeRegion,
  shippingCost,
  onChangeShippingCost,
  shippingPaidByStore,
  onChangeShippingPaidByStore,
  registerShippingExpense,
  onChangeRegisterShippingExpense,
  discount,
  onChangeDiscount,
  notes,
  onChangeNotes,
  pricingSettings,
  onApplySuggestedUnitPrice
}: Props) {
  const shipping = shippingPaidByStore ? toNumber(shippingCost) : 0;
  const totalQty = Math.max(
    1,
    items.reduce((acc, it) => acc + Math.max(1, Math.trunc(it.quantity)), 0)
  );
  const shippingPerUnit = shipping / totalQty;

  const isMl = channel === 'mercado_livre_normal' || channel === 'mercado_livre_full';
  const mlFee = isMl ? pricingSettings.mlFeePercent : 0;

  const suggestions = useMemo(() => {
    return items.map((it) => {
      const p = products.find((x) => x.id === it.productId) ?? null;

      const kitCost =
        p?.packing_kit_id && kitCostById[p.packing_kit_id] != null ? Number(kitCostById[p.packing_kit_id]) : null;

      const autoPackaging =
        p?.packaging_cost != null ? Number(p.packaging_cost) : kitCost != null ? kitCost : 0;

      const packagingLine = it.useAutoPackaging ? autoPackaging : toNumber(it.packagingCost);
      const qty = Math.max(1, Math.trunc(it.quantity));
      const packagingPerUnit = packagingLine / qty;

      const result = calculatePrice({
        productCost: Number(p?.cost ?? 0),
        packagingCost: packagingPerUnit,
        shippingCost: shippingPerUnit,
        mlFeePercent: mlFee,
        taxCbsPercent: pricingSettings.taxCbsPercent,
        taxIbsPercent: pricingSettings.taxIbsPercent,
        taxIsPercent: pricingSettings.taxIsPercent,
        marginPercent: pricingSettings.defaultMarginPercent
      });

      return { itemId: it.id, product: p, suggested: result.finalPrice, breakdown: result };
    });
  }, [items, products, kitCostById, shippingPerUnit, mlFee, pricingSettings]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="md:col-span-3">
          <div className="label mb-1">Frete</div>
          <label className="mb-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={shippingPaidByStore}
              onChange={(e) => onChangeShippingPaidByStore(e.target.checked)}
            />
            <span>Pago pela loja</span>
          </label>

          <input
            className="input"
            inputMode="decimal"
            value={shippingPaidByStore ? shippingCost : '0'}
            disabled={!shippingPaidByStore}
            onChange={(e) => onChangeShippingCost(e.target.value)}
          />

          <label className="mt-2 flex items-center gap-2 text-[11px] text-gray-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={registerShippingExpense}
              disabled={!shippingPaidByStore}
              onChange={(e) => onChangeRegisterShippingExpense(e.target.checked)}
            />
            <span>Registrar como despesa automaticamente</span>
          </label>

          <div className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
            Distribuição: {fmtBRL(shippingPerUnit)} por unidade (estimativa).
          </div>
        </div>

        <div className="md:col-span-3">
          <div className="label mb-1">Desconto (R$)</div>
          <input className="input" inputMode="decimal" value={discount} onChange={(e) => onChangeDiscount(e.target.value)} />
        </div>

        <div className="md:col-span-3">
          <div className="label mb-1">Região (opcional)</div>
          <select className="input" value={region} onChange={(e) => onChangeRegion(e.target.value)}>
            <option value="">Não informado</option>
            <option value="Norte">Norte</option>
            <option value="Nordeste">Nordeste</option>
            <option value="Centro-Oeste">Centro-Oeste</option>
            <option value="Sudeste">Sudeste</option>
            <option value="Sul">Sul</option>
            <option value="Exterior">Exterior</option>
          </select>
        </div>

        <div className="md:col-span-12">
          <div className="label mb-1">Observações (opcional)</div>
          <textarea className="input min-h-[90px]" value={notes} onChange={(e) => onChangeNotes(e.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Prévia de preço sugerido</div>
        <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
          Sugestão por item usando {pricingSettings.defaultMarginPercent}% de margem, taxas configuradas e o frete estimado por unidade.
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
              <tr className="border-b border-gray-100 dark:border-slate-800">
                <th className="py-2 text-left">Produto</th>
                <th className="py-2 text-left w-[80px]">Qtd</th>
                <th className="py-2 text-left w-[140px]">Preço atual</th>
                <th className="py-2 text-left w-[160px]">Sugestão (un)</th>
                <th className="py-2 text-left w-[150px]" />
              </tr>
            </thead>
            <tbody>
              {suggestions.map((s) => {
                const it = items.find((x) => x.id === s.itemId)!;
                const current = toNumber(it.unitPrice);
                const suggested = s.suggested;
                return (
                  <tr key={s.itemId} className="border-b border-gray-100 dark:border-slate-800">
                    <td className="py-2 pr-3">
                      {s.product ? (
                        <>
                          {s.product.name} {s.product.size_cm ? `${s.product.size_cm}cm` : ''} • {s.product.variant}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 pr-3">{it.quantity}</td>
                    <td className="py-2 pr-3">{fmtBRL(current)}</td>
                    <td className="py-2 pr-3">
                      {suggested == null ? (
                        <span className="text-xs text-gray-500 dark:text-slate-400">Revisar taxas</span>
                      ) : (
                        <span className="font-medium">{fmtBRL(suggested)}</span>
                      )}
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={suggested == null}
                        onClick={() => suggested != null && onApplySuggestedUnitPrice(s.itemId, suggested)}
                      >
                        Aplicar sugestão
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-2 text-[11px] text-gray-500 dark:text-slate-400">
          Observação: a sugestão é uma estimativa. Ajuste conforme comissão real do anúncio, condições de envio e estratégia de margem.
        </div>
      </div>
    </div>
  );
}
