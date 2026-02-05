import type { Product } from '../../lib/types';
import type { PricingSettings } from '../../hooks/usePricingSettings';
import type { SaleDraftItem } from './types';
import { fmtBRL, toNumber } from './types';

type Props = {
  products: Product[];
  kitCostById: Record<string, number | undefined>;
  items: SaleDraftItem[];
  channel: string;
  region: string;
  shippingCost: string;
  shippingPaidByStore: boolean;
  registerShippingExpense: boolean;
  discount: string;
  notes: string;
  pricingSettings: PricingSettings;
  isSubmitting: boolean;
  onConfirm: () => void;
};

export default function SaleStepReview({
  products,
  kitCostById,
  items,
  channel,
  region,
  shippingCost,
  shippingPaidByStore,
  registerShippingExpense,
  discount,
  notes,
  pricingSettings,
  isSubmitting,
  onConfirm
}: Props) {
  const shipping = shippingPaidByStore ? toNumber(shippingCost) : 0;
  const discountValue = Math.max(0, toNumber(discount));

  const lines = items
    .map((it) => {
      const p = products.find((x) => x.id === it.productId) ?? null;
      const qty = Math.max(1, Math.trunc(it.quantity));
      const unit = toNumber(it.unitPrice);
      const gross = qty * unit;
      const kitCost =
        p?.packing_kit_id && kitCostById[p.packing_kit_id] != null ? Number(kitCostById[p.packing_kit_id]) : null;

      const autoPackaging =
        p?.packaging_cost != null ? Number(p.packaging_cost) : kitCost != null ? kitCost : 0;

      const packaging = it.useAutoPackaging ? autoPackaging : toNumber(it.packagingCost);
      return { it, p, qty, unit, gross, packaging };
    })
    .filter((l) => l.p);

  const grossTotal = lines.reduce((acc, l) => acc + l.gross, 0);
  const grossAfterDiscount = Math.max(0, grossTotal - discountValue);

  const isMl = channel === 'mercado_livre_normal' || channel === 'mercado_livre_full';
  const mlFeeRate = isMl ? pricingSettings.mlFeePercent / 100 : 0;
  const cbs = pricingSettings.taxCbsPercent / 100;
  const ibs = pricingSettings.taxIbsPercent / 100;
  const is = pricingSettings.taxIsPercent / 100;

  const mlFeeValue = grossAfterDiscount * mlFeeRate;
  const taxesValue = grossAfterDiscount * (cbs + ibs + is);
  const packagingTotal = lines.reduce((acc, l) => acc + Number(l.packaging ?? 0), 0);

  const netEst = grossAfterDiscount - mlFeeValue - taxesValue - shipping - packagingTotal;

  const inventoryIssues = lines.filter((l) => {
    const current = Number(l.p?.stock ?? 0);
    const after = current - l.qty;
    return after < 0 || after < Number(l.p?.min_stock ?? 0);
  });

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Resumo</div>

        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-6">
          <SummaryBox title="Bruto" value={fmtBRL(grossTotal)} />
          <SummaryBox title="Desconto" value={fmtBRL(discountValue)} />
          <SummaryBox
            title="Frete"
            value={shippingPaidByStore ? fmtBRL(shipping) : 'Pago pelo cliente'}
          />
          <SummaryBox title="Embalagem" value={fmtBRL(packagingTotal)} />
          <SummaryBox title="Taxas + Impostos" value={fmtBRL(mlFeeValue + taxesValue)} />
          <SummaryBox title="Líquido est." value={fmtBRL(netEst)} highlight />
        </div>

        {shippingPaidByStore && registerShippingExpense && shipping > 0 ? (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200">
            O frete será registrado automaticamente em <span className="font-medium">Despesas</span> para facilitar a auditoria.
          </div>
        ) : null}

        <div className="mt-3 text-xs text-gray-500 dark:text-slate-400">
          Canal: <span className="text-gray-800 dark:text-slate-200">{channel}</span>
          {region ? (
            <>
              {' '}
              • Região: <span className="text-gray-800 dark:text-slate-200">{region}</span>
            </>
          ) : null}
        </div>

        {notes ? (
          <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            {notes}
          </div>
        ) : null}
      </div>

      <div className="card p-4">
        <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Impacto no estoque</div>
        <div className="mt-3 table-scroll">
          <table className="table-base min-w-[720px] w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
              <tr className="border-b border-gray-100 dark:border-slate-800">
                <th className="py-2 text-left">Produto</th>
                <th className="py-2 text-left w-[80px]">Qtd</th>
                <th className="py-2 text-left w-[110px]">Atual</th>
                <th className="py-2 text-left w-[110px]">Após</th>
                <th className="py-2 text-left w-[110px]">Mínimo</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const current = Number(l.p?.stock ?? 0);
                const after = current - l.qty;
                const min = Number(l.p?.min_stock ?? 0);
                const danger = after < 0 || after < min;
                return (
                  <tr key={l.it.id} className="border-b border-gray-100 dark:border-slate-800">
                    <td className="py-2 pr-3">
                      {l.p?.name} {l.p?.size_cm ? `${l.p.size_cm}cm` : ''} • {l.p?.variant}
                    </td>
                    <td className="py-2 pr-3">{l.qty}</td>
                    <td className="py-2 pr-3">{current}</td>
                    <td className="py-2 pr-3">
                      <span className={danger ? 'font-semibold text-red-600 dark:text-red-400' : ''}>{after}</span>
                    </td>
                    <td className="py-2 pr-3">{min}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {inventoryIssues.length > 0 ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            Atenção: há itens que ficarão negativos ou abaixo do estoque mínimo. Confirme se isso é esperado.
          </div>
        ) : null}
      </div>

      <div className="flex justify-end">
        <button type="button" className="btn-primary" onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? 'Registrando...' : 'Confirmar venda'}
        </button>
      </div>
    </div>
  );
}

function SummaryBox({
  title,
  value,
  highlight
}: {
  title: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{title}</div>
      <div className={['mt-2 text-lg font-semibold', highlight ? 'text-blue-600 dark:text-cyan-300' : 'text-gray-900 dark:text-slate-100'].join(' ')}>
        {value}
      </div>
    </div>
  );
}


