import { useEffect, useMemo, useState } from 'react';
import type { PackingKit, Product } from '../lib/types';
import { listPackingKits, listProducts, upsertProduct, updateProduct } from '../lib/db';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import StatusChip from '../ui/StatusChip';

function toNumber(v: string): number {
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export default function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [kits, setKits] = useState<PackingKit[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const [draft, setDraft] = useState({
    name: '',
    variant: 'branco',
    size_cm: 20,
    cost: 0,
    price: 0,
    stock: 0,
    min_stock: 2,
    packing_kit_id: ''
  });

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const p = await listProducts();
      setProducts(p);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar produtos.');
    } finally {
      setLoading(false);
    }
  }

  async function refreshKits() {
    try {
      const k = await listPackingKits();
      setKits(k);
    } catch {
      setKits([]);
    }
  }

  useEffect(() => {
    refresh();
    refreshKits();
  }, []);

  const rows = useMemo(() => {
    return products.map((p) => ({
      ...p,
      status: (p.stock ?? 0) <= (p.min_stock ?? 1) ? 'COMPRAR' : 'OK'
    }));
  }, [products]);

  async function onCreate() {
    setErr(null);
    try {
      await upsertProduct({
        name: draft.name.trim(),
        variant: draft.variant.trim(),
        size_cm: draft.size_cm,
        material: 'resina_marmorizada',
        cost: draft.cost,
        price: draft.price,
        stock: draft.stock,
        min_stock: draft.min_stock,
        packing_kit_id: draft.packing_kit_id ? draft.packing_kit_id : null,
        is_active: true
      } as any);
      setNewOpen(false);
      setDraft({ name: '', variant: 'branco', size_cm: 20, cost: 0, price: 0, stock: 0, min_stock: 2, packing_kit_id: '' });
      await refresh();
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao criar produto.');
    }
  }

  async function quickUpdate(id: string, patch: Partial<Product>) {
    setErr(null);
    try {
      await updateProduct(id, patch);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } as Product : p)));
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao atualizar produto.');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estoque"
        subtitle="Controle de SKUs, custo, preco e nivel de reposicao."
        actions={
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={refresh} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
            <button className="btn-primary" onClick={() => setNewOpen(true)}>
              Novo produto
            </button>
          </div>
        }
      />

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
          {err}
        </div>
      ) : null}

      {newOpen ? (
        <SectionCard
          title="Cadastrar novo produto"
          action={
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={onCreate}>
                Salvar
              </button>
              <button className="btn-ghost" onClick={() => setNewOpen(false)}>
                Cancelar
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <div className="label mb-1">Nome</div>
              <input
                className="input"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Sao Miguel Arcanjo Gargano"
              />
            </div>
            <div>
              <div className="label mb-1">Variante</div>
              <input
                className="input"
                value={draft.variant}
                onChange={(e) => setDraft((d) => ({ ...d, variant: e.target.value }))}
                placeholder="branco / sombreado"
              />
            </div>
            <div>
              <div className="label mb-1">Tamanho (cm)</div>
              <input
                className="input"
                value={String(draft.size_cm)}
                onChange={(e) => setDraft((d) => ({ ...d, size_cm: toNumber(e.target.value) }))}
                inputMode="numeric"
              />
            </div>
            <div>
              <div className="label mb-1">Custo</div>
              <input
                className="input"
                inputMode="decimal"
                value={String(draft.cost)}
                onChange={(e) => setDraft((d) => ({ ...d, cost: toNumber(e.target.value) }))}
              />
            </div>
            <div>
              <div className="label mb-1">Preco base</div>
              <input
                className="input"
                inputMode="decimal"
                value={String(draft.price)}
                onChange={(e) => setDraft((d) => ({ ...d, price: toNumber(e.target.value) }))}
              />
            </div>
            <div>
              <div className="label mb-1">Estoque</div>
              <input
                className="input"
                value={String(draft.stock)}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, stock: Math.max(0, Math.trunc(toNumber(e.target.value))) }))
                }
                inputMode="numeric"
              />
            </div>
            <div>
              <div className="label mb-1">Estoque minimo</div>
              <input
                className="input"
                value={String(draft.min_stock)}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    min_stock: Math.max(0, Math.trunc(toNumber(e.target.value)))
                  }))
                }
                inputMode="numeric"
              />
            </div>
            <div>
              <div className="label mb-1">Kit de embalagem</div>
              <select
                className="input"
                value={draft.packing_kit_id}
                onChange={(e) => setDraft((d) => ({ ...d, packing_kit_id: e.target.value }))}
              >
                <option value="">Sem kit</option>
                {kits.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard title="Produtos">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                <th className="px-2 py-2 font-semibold">Produto</th>
                <th className="px-2 py-2 font-semibold">Tamanho</th>
                <th className="px-2 py-2 font-semibold">Kit</th>
                <th className="px-2 py-2 text-right font-semibold">Custo</th>
                <th className="px-2 py-2 text-right font-semibold">Preco</th>
                <th className="px-2 py-2 text-center font-semibold">Estoque</th>
                <th className="px-2 py-2 text-center font-semibold">Minimo</th>
                <th className="px-2 py-2 text-center font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-900">
                  <td className="px-2 py-3">
                    <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{p.name}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">{p.variant}</div>
                  </td>
                  <td className="px-2 py-3">{p.size_cm ? `${p.size_cm} cm` : '—'}</td>
                  <td className="px-2 py-3">
                    <select
                      className="input w-44"
                      value={p.packing_kit_id ?? ''}
                      onChange={(e) => quickUpdate(p.id, { packing_kit_id: e.target.value || null })}
                    >
                      <option value="">Sem kit</option>
                      {kits.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-3 text-right">
                    <input
                      className="input w-24 text-right"
                      value={String(p.cost)}
                      onChange={(e) => quickUpdate(p.id, { cost: toNumber(e.target.value) })}
                    />
                  </td>
                  <td className="px-2 py-3 text-right">
                    <input
                      className="input w-24 text-right"
                      value={String(p.price)}
                      onChange={(e) => quickUpdate(p.id, { price: toNumber(e.target.value) })}
                    />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <input
                      className="input w-20 text-center"
                      value={String(p.stock)}
                      onChange={(e) =>
                        quickUpdate(p.id, { stock: Math.max(0, Math.trunc(toNumber(e.target.value))) })
                      }
                      inputMode="numeric"
                    />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <input
                      className="input w-20 text-center"
                      value={String(p.min_stock)}
                      onChange={(e) =>
                        quickUpdate(p.id, { min_stock: Math.max(0, Math.trunc(toNumber(e.target.value))) })
                      }
                      inputMode="numeric"
                    />
                  </td>
                  <td className="px-2 py-3 text-center">
                    <StatusChip status={p.status} />
                  </td>
                </tr>
              ))}
              {!rows.length && !loading ? (
                <tr>
                  <td colSpan={8} className="px-2 py-6">
                    <div className="text-center text-sm text-gray-500 dark:text-slate-400">
                      Nenhum produto cadastrado.
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <div className="text-xs text-gray-500 dark:text-slate-400">
        Dica: se voce estiver no inicio, mantenha o minimo em 2 unidades para evitar ruptura.
      </div>
    </div>
  );
}
