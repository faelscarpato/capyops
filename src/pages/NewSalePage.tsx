import { useEffect, useMemo, useState } from 'react';
import { ReceiptText } from 'lucide-react';
import type { Product } from '../lib/types';
import { applySale, listProducts } from '../lib/db';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';

function toNumber(v: string): number {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export default function NewSalePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [productId, setProductId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [salePrice, setSalePrice] = useState('');
  const [shippingCost, setShippingCost] = useState('0');
  const [channel, setChannel] = useState('mercado_livre_normal');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const p = await listProducts();
      setProducts(p);
      setProductId(p[0]?.id ?? '');
      setLoading(false);
    })();
  }, []);

  const selected = useMemo(() => products.find((p) => p.id === productId) ?? null, [products, productId]);

  useEffect(() => {
    if (selected && (!salePrice || Number(salePrice) === 0)) {
      setSalePrice(String(selected.price ?? 0));
    }
  }, [selected]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      if (!productId) throw new Error('Selecione um produto.');
      const q = Math.max(1, Math.trunc(quantity));
      const sp = toNumber(salePrice);
      const sc = toNumber(shippingCost);
      if (sp <= 0) throw new Error('Preço de venda inválido.');

      await applySale({
        product_id: productId,
        quantity: q,
        channel,
        sale_price: sp,
        shipping_cost: sc
      });

      setMsg('Venda registrada e estoque atualizado.');
      setQuantity(1);
    } catch (e: any) {
      setMsg(e?.message ?? 'Erro ao salvar venda.');
    } finally {
      setBusy(false);
    }
  }

  const isError = msg?.startsWith('Erro');

  return (
    <div className="space-y-6">
      <PageHeader title="Nova venda" subtitle="Registre venda manualmente. Isso atualiza estoque e lucro estimado." />

      {msg ? (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            isError
              ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-900/30 dark:text-emerald-200'
          }`}
        >
          {msg}
        </div>
      ) : null}

      <SectionCard title="Registrar venda">
        <form onSubmit={onSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <div className="label mb-1">Produto</div>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                disabled={loading}
                className="input"
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
            </div>

            <div>
              <div className="label mb-1">Quantidade</div>
              <input
                className="input"
                value={String(quantity)}
                onChange={(e) => setQuantity(Math.max(1, Math.trunc(toNumber(e.target.value))))}
                inputMode="numeric"
              />
            </div>

            <div>
              <div className="label mb-1">Canal</div>
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className="input">
                <option value="mercado_livre_normal">Mercado Livre (Normal)</option>
                <option value="mercado_livre_full">Mercado Livre (Full)</option>
                <option value="outro">Outro</option>
              </select>
            </div>

            <div>
              <div className="label mb-1">Preco de venda (un)</div>
              <input
                className="input"
                inputMode="decimal"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>

            <div>
              <div className="label mb-1">Custo de frete (se voce paga)</div>
              <input
                className="input"
                inputMode="decimal"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-gray-500 dark:text-slate-400">
              {selected ? (
                <>
                  Referencia do produto: custo{' '}
                  {selected.cost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} • preco base{' '}
                  {selected.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </>
              ) : (
                'Selecione um produto.'
              )}
            </div>
            <button className="btn-primary" disabled={busy || loading} type="submit">
              {busy ? 'Salvando...' : 'Salvar venda'}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Nota operacional"
        action={<ReceiptText className="h-4 w-4 text-gray-500 dark:text-slate-400" />}
      >
        <div className="text-sm text-gray-600 dark:text-slate-300">
          O lucro no Dashboard e estimado. No MVP, usamos taxa ML padrao de 17% quando a venda nao informa uma taxa
          especifica.
        </div>
      </SectionCard>
    </div>
  );
}
