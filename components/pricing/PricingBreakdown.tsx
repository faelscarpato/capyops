import type { PricingResult } from '../../lib/pricing';

type Props = {
  result: PricingResult | null;
};

function pct(part: number, total: number) {
  if (!Number.isFinite(part) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, (part / total) * 100));
}

export default function PricingBreakdown({ result }: Props) {
  if (!result) {
    return (
      <div className="card p-4 text-sm text-gray-600 dark:text-slate-300">
        Preencha os dados ao lado para ver o detalhamento do preço sugerido.
      </div>
    );
  }

  const { finalPrice, totalCost, grossProfit, grossMarginPercent, breakdown } = result;

  return (
    <div className="space-y-4 card p-4">
      <div>
        <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">Resumo</div>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Preço sugerido</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">R$ {finalPrice?.toFixed(2) ?? '0.00'}</div>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Margem bruta</div>
            <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">{grossMarginPercent.toFixed(1)}%</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">Lucro: R$ {grossProfit.toFixed(2)}</div>
          </div>
        </div>

        <div className="mt-3 text-xs text-gray-500 dark:text-slate-400">
          Custo total estimado: <span className="font-medium text-gray-800 dark:text-slate-200">R$ {totalCost.toFixed(2)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Custos base</div>
          <div className="mt-2 space-y-1 text-sm">
            <Row label="Produto" value={breakdown.productCost} />
            <Row label="Embalagem" value={breakdown.packagingCost} />
            <Row label="Frete" value={breakdown.shippingCost} />
          </div>
        </div>

        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Taxas</div>
          <div className="mt-2 space-y-1 text-sm">
            <Row label="Taxa ML" value={breakdown.mlFeeValue} />
            <Row label="CBS" value={breakdown.taxCbsValue} />
            <Row label="IBS" value={breakdown.taxIbsValue} />
            <Row label="IS" value={breakdown.taxIsValue} />
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
          Participação no preço
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-slate-950">
          <div className="flex h-full w-full">
            <div className="bg-slate-400" style={{ width: `${pct(breakdown.productCost, finalPrice ?? 0)}%` }} />
            <div className="bg-slate-300" style={{ width: `${pct(breakdown.packagingCost, finalPrice ?? 0)}%` }} />
            <div className="bg-slate-200" style={{ width: `${pct(breakdown.shippingCost, finalPrice ?? 0)}%` }} />
            <div className="bg-amber-300" style={{ width: `${pct(breakdown.mlFeeValue, finalPrice ?? 0)}%` }} />
            <div className="bg-amber-200" style={{ width: `${pct(breakdown.taxCbsValue, finalPrice ?? 0)}%` }} />
            <div className="bg-amber-100" style={{ width: `${pct(breakdown.taxIbsValue, finalPrice ?? 0)}%` }} />
            <div className="bg-yellow-50" style={{ width: `${pct(breakdown.taxIsValue, finalPrice ?? 0)}%` }} />
          </div>
        </div>
        <div className="mt-2 text-[11px] text-gray-500 dark:text-slate-400">
          A barra mostra quanto cada componente ocupa dentro do preço final.
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-700 dark:text-slate-200">{label}</span>
      <span className="font-medium text-gray-900 dark:text-slate-100">R$ {value.toFixed(2)}</span>
    </div>
  );
}

