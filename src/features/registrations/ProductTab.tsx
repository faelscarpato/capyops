import { useState, useMemo, useEffect } from 'react';
import { Download } from 'lucide-react';
import { exportToCSV } from '../../lib/utils';
import ProductForm, { ProductDraft } from '../inventory/ProductForm';
import ProductTable from '../inventory/ProductTable';
import { listProducts, listPackingKits, upsertProduct, updateProduct, deleteProduct } from '../../lib/db';
import { Product, PackingKit } from '../../lib/types';
import SectionCard from '../../ui/SectionCard';

const emptyDraft: ProductDraft = {
    name: '',
    variant: '',
    size_cm: 20,
    sku: null,
    category: null,
    supplier_name: null,
    lead_time_days: null,
    ml_listing_id: null,
    material: 'resina_marmorizada',
    notes: null,
    cost: 0,
    price: 0,
    packing_kit_id: null,
    packaging_cost: null,
    stock: 0,
    min_stock: 0,
    is_active: true
};

export default function ProductTab() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [packingKits, setPackingKits] = useState<PackingKit[]>([]);
    const [editing, setEditing] = useState<Product | null>(null);
    const [draft, setDraft] = useState<ProductDraft>(emptyDraft);
    const [filter, setFilter] = useState('');
    const [formOpen, setFormOpen] = useState(false);

    async function refresh() {
        try {
            setLoading(true);
            setError(null);
            const [ps, ks] = await Promise.all([listProducts({ includeInactive: true }), listPackingKits()]);
            setProducts(ps);
            setPackingKits(ks);
        } catch (e: any) {
            setError(e?.message ?? 'Erro ao carregar produtos');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    const filtered = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return products.filter((p) => {
            if (!q) return true;
            const hay = `${p.name} ${p.variant} ${p.category ?? ''} ${p.sku ?? ''}`.toLowerCase();
            return hay.includes(q);
        });
    }, [products, filter]);

    function beginCreate() {
        setEditing(null);
        setDraft(emptyDraft);
        setFormOpen(true);
    }

    function beginEdit(p: Product) {
        setEditing(p);
        setDraft({ ...p });
        setFormOpen(true);
    }

    async function handleSubmit() {
        try {
            setSaving(true);
            await upsertProduct(draft as any);
            await refresh();
            setEditing(null);
            setDraft(emptyDraft);
            setFormOpen(false);
        } catch (e: any) {
            setError(e?.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(p: Product) {
        if (!confirm('Tem certeza?')) return;
        try {
            await deleteProduct(p.id);
            await refresh();
        } catch (e: any) {
            setError(e?.message);
        }
    }

    async function handleToggleActive(p: Product) {
        try {
            await updateProduct(p.id, { is_active: !p.is_active });
            await refresh();
        } catch (e: any) {
            setError(e?.message);
        }
    }

    return (
        <div className="space-y-4">
            <SectionCard
                title={`Produtos Cadastrados (${filtered.length})`}
                action={
                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            className="input w-full sm:w-60"
                            placeholder="Buscar produto..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                        <button onClick={() => exportToCSV(filtered, 'produtos.csv')} className="btn-ghost text-xs p-1">
                            <Download size={16} />
                        </button>
                        <button onClick={beginCreate} className="btn-primary text-xs">
                            Novo Produto
                        </button>
                    </div>
                }
            >
                {error ? <div className="alert alert-error mb-3">{error}</div> : null}
                {loading ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400">Carregando...</p>
                ) : (
                    <ProductTable items={filtered} onEdit={beginEdit} onDelete={handleDelete} onToggleActive={handleToggleActive} />
                )}
            </SectionCard>

            {formOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="card w-full max-w-3xl p-5 shadow-xl max-h-[90vh] overflow-y-auto">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                                {editing ? 'Editar Produto' : 'Novo Produto'}
                            </h3>
                            <button
                                className="btn-ghost"
                                type="button"
                                onClick={() => {
                                    setFormOpen(false);
                                    setEditing(null);
                                    setDraft(emptyDraft);
                                }}
                            >
                                Fechar
                            </button>
                        </div>
                        <ProductForm
                            title=""
                            draft={draft}
                            onChange={setDraft}
                            onSubmit={handleSubmit}
                            onCancel={() => {
                                setFormOpen(false);
                                setEditing(null);
                                setDraft(emptyDraft);
                            }}
                            isSubmitting={saving}
                            packingKits={packingKits}
                        />
                    </div>
                </div>
            ) : null}
        </div>
    );
}

