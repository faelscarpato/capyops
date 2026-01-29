import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import { deleteProduct, listPackingKits, listProducts, upsertProduct, updateProduct } from '../lib/db';
import type { PackingKit, Product } from '../lib/types';
import ProductTable from '../features/inventory/ProductTable';
import ProductForm, { type ProductDraft } from '../features/inventory/ProductForm';

const STORAGE_KEY = 'capyops_inventory_filters_v1';

type Filters = {
  q: string;
  category: string;
  includeInactive: boolean;
  onlyCritical: boolean;
};

const defaultFilters: Filters = {
  q: '',
  category: 'all',
  includeInactive: true,
  onlyCritical: false
};

const emptyDraft: ProductDraft = {
  name: '',
  variant: 'branco',
  size_cm: 20,
  sku: null,
  category: null,
  supplier_name: null,
  lead_time_days: null,
  ml_listing_id: null,
  material: 'Resina',
  notes: null,
  cost: 0,
  price: 0,
  packing_kit_id: null,
  packaging_cost: null,
  stock: 0,
  min_stock: 2,
  is_active: true
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export default function InventoryPage() {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [packingKits, setPackingKits] = useState<PackingKit[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [editing, setEditing] = useState<Product | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft);

  useEffect(() => {
    // filtros persistentes + query param (atalho vindo do dashboard)
    const saved = safeParse<Partial<Filters>>(window.localStorage.getItem(STORAGE_KEY));
    const params = new URLSearchParams(location.search);
    const forceCritical = params.get('f') === 'critical';
    setFilters({
      ...defaultFilters,
      ...(saved || {}),
      ...(forceCritical ? { onlyCritical: true } : {})
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // ignore
    }
  }, [filters]);

  async function refresh() {
    try {
      setLoading(true);
      setError(null);
      const [ps, ks] = await Promise.all([listProducts({ includeInactive: true }), listPackingKits()]);
      setProducts(ps);
      setPackingKits(ks);
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar estoque');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return products
      .filter((p) => (filters.includeInactive ? true : p.is_active))
      .filter((p) => (filters.category === 'all' ? true : (p.category ?? '').toLowerCase() === filters.category))
      .filter((p) => (filters.onlyCritical ? p.stock <= (p.min_stock ?? 0) : true))
      .filter((p) => {
        if (!q) return true;
        const hay = `${p.name} ${p.variant} ${p.size_cm ?? ''} ${p.sku ?? ''} ${p.ml_listing_id ?? ''}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name) || a.variant.localeCompare(b.variant));
  }, [products, filters]);

  function beginCreate() {
    setEditing(null);
    setDraft(emptyDraft);
  }

  function beginEdit(p: Product) {
    setEditing(p);
    setDraft({ ...p });
  }

  async function handleSubmit() {
    try {
      setSaving(true);
      setError(null);
      await upsertProduct(draft as any);
      await refresh();
      beginCreate();
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(p: Product) {
    try {
      await updateProduct(p.id, { is_active: !p.is_active });
      await refresh();
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao atualizar produto');
    }
  }

  async function handleDelete(p: Product) {
    const ok = window.confirm(`Excluir "${p.name} • ${p.variant}"? Isso não pode ser desfeito.`);
    if (!ok) return;
    try {
      await deleteProduct(p.id);
      await refresh();
      if (editing?.id === p.id) beginCreate();
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao excluir produto');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estoque"
        subtitle="Lista + formulário separados, filtros persistentes e foco no que vira ação (crítico / inativo / categoria)."
      />

      <SectionCard
        title="Filtros"
        action={
          <button className="btn-primary" onClick={beginCreate}>
            Novo produto
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-5">
            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Buscar</span>
              <input
                value={filters.q}
                onChange={(e) => setFilters((f) => ({ ...f, q: e.currentTarget.value }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                placeholder="Nome, variante, SKU, ML..."
              />
            </label>
          </div>

          <div className="md:col-span-3">
            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Categoria</span>
              <select
                value={filters.category}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.currentTarget.value }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="all">Todas</option>
                {categories.map((c) => (
                  <option key={c} value={c.toLowerCase()}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Inativos</span>
              <select
                value={filters.includeInactive ? '1' : '0'}
                onChange={(e) => setFilters((f) => ({ ...f, includeInactive: e.currentTarget.value === '1' }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="1">Mostrar</option>
                <option value="0">Ocultar</option>
              </select>
            </label>
          </div>

          <div className="md:col-span-2">
            <label className="space-y-1">
              <span className="text-xs font-medium text-gray-700 dark:text-slate-300">Crítico</span>
              <select
                value={filters.onlyCritical ? '1' : '0'}
                onChange={(e) => setFilters((f) => ({ ...f, onlyCritical: e.currentTarget.value === '1' }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="0">Todos</option>
                <option value="1">Abaixo do mínimo</option>
              </select>
            </label>
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="md:col-span-8">
          <SectionCard title={`Produtos (${filtered.length})`}>
            {loading ? (
              <p className="text-sm text-gray-500 dark:text-slate-300">Carregando...</p>
            ) : (
              <ProductTable items={filtered} onEdit={beginEdit} onToggleActive={handleToggleActive} onDelete={handleDelete} />
            )}
          </SectionCard>
        </div>

        <div className="md:col-span-4">
          <SectionCard title={editing ? 'Editar produto' : 'Novo produto'}>
            <ProductForm
              title=""
              draft={draft}
              onChange={setDraft}
              onSubmit={handleSubmit}
              onCancel={editing ? beginCreate : undefined}
              isSubmitting={saving}
              packingKits={packingKits}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
