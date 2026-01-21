import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import { readTaxRates, writeTaxRates } from '../lib/taxRates';
import type { Product } from '../lib/types';
import { getPackingKitCost, listProducts } from '../lib/db';

function toNumber(value: string): number {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function fmtBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function PriceCalculatorPage() {
  const storedRates = useMemo(() => readTaxRates(), []);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [useInventory, setUseInventory] = useState(false);
  const [kitCost, setKitCost] = useState<number | null>(null);
  const [productCost, setProductCost] = useState('40');
  const [packagingCost, setPackagingCost] = useState('5');
  const [shippingCost, setShippingCost] = useState('20');
  const [mlFee, setMlFee] = useState(String(storedRates.mlFee));
  const [cbsRate, setCbsRate] = useState(String(storedRates.cbs));
  const [ibsRate, setIbsRate] = useState(String(storedRates.ibs));
  const [isRate, setIsRate] = useState(String(storedRates.is));
  const [marginRate, setMarginRate] = useState(String(storedRates.margin));

  useEffect(() => {
    (async () => {
      const p = await listProducts();
      setProducts(p);
      setSelectedProductId(p[0]?.id ?? '');
    })();
  }, []);

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
      const cost = await getPackingKitCost(selectedProduct.packing_kit_id as string);
      setKitCost(cost);
      if (useInventory) {
        setPackagingCost(String(cost));
      }
    })();
  }, [selectedProduct, useInventory]);

  useEffect(() => {
    if (!useInventory || !selectedProduct) return;
    setProductCost(String(selectedProduct.cost ?? 0));
    if (!selectedProduct.packing_kit_id) {
      setPackagingCost('0');
    }
  }, [useInventory, selectedProduct]);

  useEffect(() => {
    writeTaxRates({
      mlFee: toNumber(mlFee),
      cbs: toNumber(cbsRate),
      ibs: toNumber(ibsRate),
      is: toNumber(isRate),
      margin: toNumber(marginRate)
    });
  }, [mlFee, cbsRate, ibsRate, isRate, marginRate]);

  const calc = useMemo(() => {
    const cost = toNumber(productCost);
    const packaging = toNumber(packagingCost);
    const shipping = toNumber(shippingCost);
    const ml = toNumber(mlFee) / 100;
    const cbs = toNumber(cbsRate) / 100;
    const ibs = toNumber(ibsRate) / 100;
    const is = toNumber(isRate) / 100;
    const margin = toNumber(marginRate) / 100;

    const base = cost + packaging + shipping;
    const totalRate = ml + cbs + ibs + is + margin;
    const price = totalRate >= 1 ? null : base / (1 - totalRate);
    const taxesValue = price == null ? null : price * (cbs + ibs + is);

    return { base, totalRate, price, taxesValue };
  }, [productCost, packagingCost, shippingCost, mlFee, cbsRate, ibsRate, isRate, marginRate]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Precificador"
        subtitle="Calcule o preco final com CBS, IBS e impostos opcionais."
      />

      <SectionCard title="Produto do estoque (opcional)">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-6">
            <div className="label mb-1">Produto</div>
            <select className="input" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
              <option value="">Selecione um produto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.size_cm ? `${p.size_cm}cm` : ''} • {p.variant}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
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
          </div>
          <div className="md:col-span-3">
            <div className="label mb-1">Kit de embalagem</div>
            <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
              {selectedProduct?.packing_kit_id
                ? kitCost == null
                  ? 'Calculando...'
                  : fmtBRL(kitCost)
                : 'Sem kit'}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Dados do produto">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-4">
            <div className="label mb-1">Custo do produto (R$)</div>
            <input className="input" value={productCost} onChange={(e) => setProductCost(e.target.value)} />
          </div>
          <div className="md:col-span-4">
            <div className="label mb-1">Custo da embalagem (R$)</div>
            <input className="input" value={packagingCost} onChange={(e) => setPackagingCost(e.target.value)} />
          </div>
          <div className="md:col-span-4">
            <div className="label mb-1">Custo do frete (R$)</div>
            <input className="input" value={shippingCost} onChange={(e) => setShippingCost(e.target.value)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Taxas e margem">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-3">
            <div className="label mb-1">Taxa ML (%)</div>
            <input className="input" value={mlFee} onChange={(e) => setMlFee(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <div className="label mb-1">Aliquota CBS (%)</div>
            <input className="input" value={cbsRate} onChange={(e) => setCbsRate(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <div className="label mb-1">Aliquota IBS (%)</div>
            <input className="input" value={ibsRate} onChange={(e) => setIbsRate(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <div className="label mb-1">Aliquota IS (%)</div>
            <input className="input" value={isRate} onChange={(e) => setIsRate(e.target.value)} />
          </div>
          <div className="md:col-span-3">
            <div className="label mb-1">Margem desejada (%)</div>
            <input className="input" value={marginRate} onChange={(e) => setMarginRate(e.target.value)} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Resultados">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Base de custos
            </div>
            <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-slate-100">{fmtBRL(calc.base)}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Total de taxas
            </div>
            <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
              {(calc.totalRate * 100).toFixed(2)}%
            </div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
              Preco final sugerido
            </div>
            <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
              {calc.price == null ? 'Revisar taxas' : fmtBRL(calc.price)}
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600 dark:text-slate-300">
          Valor estimado de impostos (CBS + IBS + IS): {calc.taxesValue == null ? 'N/A' : fmtBRL(calc.taxesValue)}
        </div>
      </SectionCard>
    </div>
  );
}
