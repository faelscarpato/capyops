import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import type { Product } from '../lib/types';
import { getPackingKitCost, listProducts } from '../lib/db';
import { calculatePrice } from '../lib/pricing';
import PricingBreakdown from '../components/pricing/PricingBreakdown';
import { usePricingSettings } from '../hooks/usePricingSettings';

function toNumber(value: string): number {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function PriceCalculatorPage() {
  const { settings, setSettings } = usePricingSettings();

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [useInventory, setUseInventory] = useState(false);
  const [kitCost, setKitCost] = useState<number | null>(null);

  const [productCost, setProductCost] = useState('40');
  const [packagingCost, setPackagingCost] = useState('5');
  const [shippingCost, setShippingCost] = useState('20');
  const [marginRate, setMarginRate] = useState(String(settings.defaultMarginPercent ?? 30));

  useEffect(() => {
    (async () => {
      const p = await listProducts({ includeInactive: true });
      setProducts(p);
      setSelectedProductId(p.find((x) => x.is_active)?.id ?? p[0]?.id ?? '');
    })();
  }, []);

  useEffect(() => {
    setMarginRate(String(settings.defaultMarginPercent ?? 30));
  }, [settings.defaultMarginPercent]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  useEffect(() => {
    if (!selectedProduct?.packing_kit_id) {
      setKitCost(null);
      return;
    }

    (async () => {
      try {
        const cost = await getPackingKitCost(selectedProduct.packing_kit_id as string);
        setKitCost(cost);
        if (useInventory) setPackagingCost(String(cost));
      } catch {
        setKitCost(null);
      }
    })();
  }, [selectedProduct, useInventory]);

  useEffect(() => {
    if (!useInventory || !selectedProduct) return;
    setProductCost(String(selectedProduct.cost ?? 0));

    // se houver custo de embalagem direto no produto, ele ganha; senão, tenta kit; senão, zero.
    if (selectedProduct.packaging_cost != null) {
      setPackagingCost(String(selectedProduct.packaging_cost));
    } else if (selectedProduct.packing_kit_id && kitCost != null) {
      setPackagingCost(String(kitCost));
    } else {
      setPackagingCost('0');
    }
  }, [useInventory, selectedProduct, kitCost]);

  const result = useMemo(() => {
    const m = toNumber(marginRate);
    return calculatePrice({
      productCost: toNumber(productCost),
      packagingCost: toNumber(packagingCost),
      shippingCost: toNumber(shippingCost),
      mlFeePercent: Number(settings.mlFeePercent ?? 0),
      taxCbsPercent: Number(settings.taxCbsPercent ?? 0),
      taxIbsPercent: Number(settings.taxIbsPercent ?? 0),
      taxIsPercent: Number(settings.taxIsPercent ?? 0),
      marginPercent: m
    });
  }, [productCost, packagingCost, shippingCost, marginRate, settings]);

  return (
    <div className="space-y-6">
      <PageHeader title="Precificador" subtitle="Layout 2 colunas + breakdown. Taxas persistem para a Nova Venda." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Esquerda: inputs */}
        <div className="space-y-6 lg:col-span-7">
          <SectionCard title="Fonte do custo (opcional)">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-7">
                <div className="label mb-1">Produto</div>
                <select
                  className="input"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                >
                  <option value="">Selecione um produto</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.size_cm ? `${p.size_cm}cm` : ''} • {p.variant} {p.is_active ? '' : '(inativo)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-5">
                <div className="label mb-1">Usar dados do estoque</div>
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={useInventory}
                    onChange={(e) => setUseInventory(e.target.checked)}
                  />
                  Auto preencher custo e embalagem
                </label>
                <div className="mt-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  Kit de embalagem: {selectedProduct?.packing_kit_id ? (kitCost == null ? '—' : `R$ ${kitCost.toFixed(2)}`) : 'Sem kit'}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Inputs">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
              <div className="md:col-span-4">
                <div className="label mb-1">Custo do produto (R$)</div>
                <input className="input" value={productCost} onChange={(e) => setProductCost(e.target.value)} />
              </div>
              <div className="md:col-span-4">
                <div className="label mb-1">Embalagem (R$)</div>
                <input className="input" value={packagingCost} onChange={(e) => setPackagingCost(e.target.value)} />
              </div>
              <div className="md:col-span-4">
                <div className="label mb-1">Frete (R$)</div>
                <input className="input" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} />
              </div>

              <div className="md:col-span-4">
                <div className="label mb-1">Margem desejada (%)</div>
                <input className="input" value={marginRate} onChange={(e) => setMarginRate(e.target.value)} />
              </div>
              <div className="md:col-span-8">
                <div className="label mb-1">Taxas (persistem em todo o app)</div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">ML (%)</div>
                    <input
                      className="input"
                      value={String(settings.mlFeePercent)}
                      onChange={(e) => setSettings((s) => ({ ...s, mlFeePercent: toNumber(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">CBS (%)</div>
                    <input
                      className="input"
                      value={String(settings.taxCbsPercent)}
                      onChange={(e) => setSettings((s) => ({ ...s, taxCbsPercent: toNumber(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">IBS (%)</div>
                    <input
                      className="input"
                      value={String(settings.taxIbsPercent)}
                      onChange={(e) => setSettings((s) => ({ ...s, taxIbsPercent: toNumber(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">IS (%)</div>
                    <input
                      className="input"
                      value={String(settings.taxIsPercent)}
                      onChange={(e) => setSettings((s) => ({ ...s, taxIsPercent: toNumber(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                  Fórmula: (Custo+Embalagem+Frete) / (1 - (ML + CBS + IBS + IS + Margem)).
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Direita: breakdown */}
        <div className="lg:col-span-5">
          <PricingBreakdown result={result.finalPrice == null ? null : result} />

          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            Dica: mantenha as taxas aqui alinhadas com o que você usa na Nova Venda. Assim, o “preço sugerido” vira um padrão operacional.
          </div>
        </div>
      </div>
    </div>
  );
}
