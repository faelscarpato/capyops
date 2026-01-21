import { useEffect, useMemo, useState } from 'react';
import type { Product, PurchaseQuote, PurchaseQuoteItem, Supply } from '../lib/types';
import {
  addPurchaseQuoteItem,
  createPurchaseQuote,
  deletePurchaseQuoteItem,
  listAllPurchaseQuoteItems,
  listPurchaseQuoteItems,
  listPurchaseQuotes,
  listProducts,
  listSupplies,
  updatePurchaseQuote,
  updatePurchaseQuoteItem
} from '../lib/db';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';

function toNumber(value: string): number {
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function fmtBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<PurchaseQuote[]>([]);
  const [items, setItems] = useState<PurchaseQuoteItem[]>([]);
  const [allItems, setAllItems] = useState<PurchaseQuoteItem[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [newQuote, setNewQuote] = useState({
    supplier_name: '',
    title: '',
    notes: ''
  });

  const [editQuote, setEditQuote] = useState({
    supplier_name: '',
    title: '',
    status: 'draft',
    notes: ''
  });

  const [newItem, setNewItem] = useState({
    supply_id: '',
    product_id: '',
    description: '',
    unit: 'un',
    qty: 1,
    unit_cost: 0
  });

  async function refreshQuotes() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listPurchaseQuotes();
      setQuotes(data);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao carregar orcamentos.');
    } finally {
      setLoading(false);
    }
  }

  async function refreshSupplies() {
    try {
      const data = await listSupplies();
      setSupplies(data);
    } catch {
      setSupplies([]);
    }
  }

  async function refreshProducts() {
    try {
      const data = await listProducts();
      setProducts(data);
    } catch {
      setProducts([]);
    }
  }

  async function refreshAllItems() {
    try {
      const data = await listAllPurchaseQuoteItems();
      setAllItems(data);
    } catch {
      setAllItems([]);
    }
  }

  async function refreshItems(quoteId: string) {
    try {
      const data = await listPurchaseQuoteItems(quoteId);
      setItems(data);
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    refreshQuotes();
    refreshSupplies();
    refreshProducts();
    refreshAllItems();
  }, []);

  useEffect(() => {
    if (!selectedQuoteId) {
      setItems([]);
      return;
    }
    refreshItems(selectedQuoteId);
  }, [selectedQuoteId]);

  useEffect(() => {
    const selected = quotes.find((q) => q.id === selectedQuoteId);
    if (!selected) return;
    setEditQuote({
      supplier_name: selected.supplier_name,
      title: selected.title ?? '',
      status: selected.status ?? 'draft',
      notes: selected.notes ?? ''
    });
  }, [quotes, selectedQuoteId]);

  const totals = useMemo(() => {
    const totalMap = new Map<string, number>();
    const countMap = new Map<string, number>();
    for (const item of allItems) {
      const total = Number(item.qty ?? 0) * Number(item.unit_cost ?? 0);
      totalMap.set(item.quote_id, (totalMap.get(item.quote_id) ?? 0) + total);
      countMap.set(item.quote_id, (countMap.get(item.quote_id) ?? 0) + 1);
    }
    return { totalMap, countMap };
  }, [allItems]);

  const selectedQuote = useMemo(
    () => quotes.find((q) => q.id === selectedQuoteId) ?? null,
    [quotes, selectedQuoteId]
  );

  const selectedTotal = useMemo(() => {
    return items.reduce((sum, it) => sum + Number(it.qty ?? 0) * Number(it.unit_cost ?? 0), 0);
  }, [items]);

  async function createQuote() {
    setErr(null);
    if (!newQuote.supplier_name.trim()) {
      setErr('Informe o fornecedor.');
      return;
    }
    try {
      const created = await createPurchaseQuote({
        supplier_name: newQuote.supplier_name.trim(),
        title: newQuote.title.trim() || null,
        notes: newQuote.notes.trim() || null
      });
      setNewQuote({ supplier_name: '', title: '', notes: '' });
      await refreshQuotes();
      await refreshAllItems();
      setSelectedQuoteId(created.id);
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao criar orcamento.');
    }
  }

  async function saveQuote() {
    if (!selectedQuoteId) return;
    try {
      await updatePurchaseQuote(selectedQuoteId, {
        supplier_name: editQuote.supplier_name.trim(),
        title: editQuote.title.trim() || null,
        status: editQuote.status,
        notes: editQuote.notes.trim() || null
      });
      await refreshQuotes();
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao atualizar orcamento.');
    }
  }

  async function addItem() {
    if (!selectedQuoteId) {
      setErr('Selecione um orcamento.');
      return;
    }
    if (!newItem.description.trim()) {
      setErr('Informe a descricao do item.');
      return;
    }
    try {
      await addPurchaseQuoteItem({
        quote_id: selectedQuoteId,
        supply_id: newItem.supply_id || null,
        product_id: newItem.product_id || null,
        description: newItem.description.trim(),
        unit: newItem.unit.trim() || 'un',
        qty: Math.max(0, Number(newItem.qty ?? 0)),
        unit_cost: Math.max(0, Number(newItem.unit_cost ?? 0))
      });
      setNewItem({ supply_id: '', product_id: '', description: '', unit: 'un', qty: 1, unit_cost: 0 });
      await refreshItems(selectedQuoteId);
      await refreshAllItems();
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao adicionar item.');
    }
  }

  function onSelectSupply(id: string) {
    const supply = supplies.find((s) => s.id === id);
    if (!supply) {
      setNewItem((prev) => ({
        ...prev,
        supply_id: '',
        product_id: prev.product_id,
        description: '',
        unit: 'un',
        unit_cost: 0
      }));
      return;
    }
    setNewItem((prev) => ({
      ...prev,
      supply_id: id,
      product_id: '',
      description: supply.name,
      unit: supply.unit,
      unit_cost: supply.cost_per_unit
    }));
  }

  function onSelectProduct(id: string) {
    const product = products.find((p) => p.id === id);
    if (!product) {
      setNewItem((prev) => ({
        ...prev,
        product_id: '',
        supply_id: prev.supply_id,
        description: '',
        unit: 'un',
        unit_cost: 0
      }));
      return;
    }
    setNewItem((prev) => ({
      ...prev,
      product_id: id,
      supply_id: '',
      description: `${product.name} ${product.size_cm ? `${product.size_cm}cm` : ''} • ${product.variant}`.trim(),
      unit: 'un',
      unit_cost: product.cost ?? 0
    }));
  }

  async function removeItem(id: string) {
    if (!selectedQuoteId) return;
    try {
      await deletePurchaseQuoteItem(id);
      await refreshItems(selectedQuoteId);
      await refreshAllItems();
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao remover item.');
    }
  }

  async function quickUpdateItem(id: string, patch: Partial<PurchaseQuoteItem>) {
    if (!selectedQuoteId) return;
    try {
      await updatePurchaseQuoteItem(id, patch);
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
      await refreshAllItems();
    } catch (e: any) {
      setErr(e?.message ?? 'Erro ao atualizar item.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader
          title="Orcamentos"
          subtitle="Monte um pedido para fornecedor e gere PDF."
          actions={
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={refreshQuotes} disabled={loading}>
                {loading ? 'Atualizando...' : 'Atualizar'}
              </button>
              <button className="btn-primary" onClick={() => window.print()} disabled={!selectedQuoteId}>
                Imprimir / PDF
              </button>
            </div>
          }
        />
      </div>

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200 no-print">
          {err}
        </div>
      ) : null}

      <div className="no-print">
        <SectionCard
          title="Criar novo orcamento"
          action={
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={createQuote}>
                Salvar
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <div className="label mb-1">Fornecedor</div>
              <input
                className="input"
                value={newQuote.supplier_name}
                onChange={(e) => setNewQuote((d) => ({ ...d, supplier_name: e.target.value }))}
                placeholder="Ex: Embalagens XYZ"
              />
            </div>
            <div>
              <div className="label mb-1">Titulo</div>
              <input
                className="input"
                value={newQuote.title}
                onChange={(e) => setNewQuote((d) => ({ ...d, title: e.target.value }))}
                placeholder="Pedido do mes"
              />
            </div>
            <div>
              <div className="label mb-1">Notas</div>
              <input
                className="input"
                value={newQuote.notes}
                onChange={(e) => setNewQuote((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Contato, prazo, etc."
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="no-print">
        <SectionCard title="Orcamentos cadastrados">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-2 py-2 font-semibold">Fornecedor</th>
                  <th className="px-2 py-2 font-semibold">Titulo</th>
                  <th className="px-2 py-2 text-center font-semibold">Itens</th>
                  <th className="px-2 py-2 text-right font-semibold">Total</th>
                  <th className="px-2 py-2 text-center font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-900">
                    <td className="px-2 py-3">
                      <div className="text-sm font-semibold text-gray-900 dark:text-slate-100">{q.supplier_name}</div>
                    </td>
                    <td className="px-2 py-3">{q.title ?? '—'}</td>
                    <td className="px-2 py-3 text-center">{totals.countMap.get(q.id) ?? 0}</td>
                    <td className="px-2 py-3 text-right">{fmtBRL(totals.totalMap.get(q.id) ?? 0)}</td>
                    <td className="px-2 py-3 text-center">
                      <button
                        className={`btn-ghost ${selectedQuoteId === q.id ? 'font-semibold' : ''}`}
                        onClick={() => setSelectedQuoteId(q.id)}
                      >
                        Gerenciar
                      </button>
                    </td>
                  </tr>
                ))}
                {!quotes.length && !loading ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-6">
                      <div className="text-center text-sm text-gray-500 dark:text-slate-400">
                        Nenhum orcamento cadastrado.
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {selectedQuote ? (
        <SectionCard
          title={`Itens do orcamento (${selectedQuote.supplier_name})`}
          action={
            <div className="flex flex-wrap gap-2 no-print">
              <button className="btn-primary" onClick={addItem}>
                Adicionar item
              </button>
              <button className="btn-ghost" onClick={saveQuote}>
                Salvar dados
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4 no-print">
            <div>
              <div className="label mb-1">Fornecedor</div>
              <input
                className="input"
                value={editQuote.supplier_name}
                onChange={(e) => setEditQuote((d) => ({ ...d, supplier_name: e.target.value }))}
              />
            </div>
            <div>
              <div className="label mb-1">Titulo</div>
              <input
                className="input"
                value={editQuote.title}
                onChange={(e) => setEditQuote((d) => ({ ...d, title: e.target.value }))}
              />
            </div>
            <div>
              <div className="label mb-1">Status</div>
              <select
                className="input"
                value={editQuote.status}
                onChange={(e) => setEditQuote((d) => ({ ...d, status: e.target.value }))}
              >
                <option value="draft">Rascunho</option>
                <option value="sent">Enviado</option>
                <option value="approved">Aprovado</option>
              </select>
            </div>
            <div>
              <div className="label mb-1">Notas</div>
              <input
                className="input"
                value={editQuote.notes}
                onChange={(e) => setEditQuote((d) => ({ ...d, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 mt-4 no-print">
            <div className="md:col-span-2">
              <div className="label mb-1">Insumo (opcional)</div>
              <select className="input" value={newItem.supply_id} onChange={(e) => onSelectSupply(e.target.value)}>
                <option value="">Selecionar insumo</option>
                {supplies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <div className="label mb-1">Produto (opcional)</div>
              <select className="input" value={newItem.product_id} onChange={(e) => onSelectProduct(e.target.value)}>
                <option value="">Selecionar produto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.size_cm ? `${p.size_cm}cm` : ''} • {p.variant}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <div className="label mb-1">Descricao</div>
              <input
                className="input"
                value={newItem.description}
                onChange={(e) => setNewItem((d) => ({ ...d, description: e.target.value }))}
                placeholder="Ex: Caixa 18x18x25"
              />
            </div>
            <div className="md:col-span-1">
              <div className="label mb-1">Unidade</div>
              <input
                className="input"
                value={newItem.unit}
                onChange={(e) => setNewItem((d) => ({ ...d, unit: e.target.value }))}
              />
            </div>
            <div className="md:col-span-1">
              <div className="label mb-1">Quantidade</div>
              <input
                className="input"
                inputMode="decimal"
                value={String(newItem.qty)}
                onChange={(e) => setNewItem((d) => ({ ...d, qty: toNumber(e.target.value) }))}
              />
            </div>
            <div className="md:col-span-2">
              <div className="label mb-1">Custo unitario</div>
              <input
                className="input"
                inputMode="decimal"
                value={String(newItem.unit_cost)}
                onChange={(e) => setNewItem((d) => ({ ...d, unit_cost: toNumber(e.target.value) }))}
              />
            </div>
          </div>

          <div className="overflow-x-auto mt-6">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="px-2 py-2 font-semibold">Item</th>
                  <th className="px-2 py-2 text-center font-semibold">Un</th>
                  <th className="px-2 py-2 text-right font-semibold">Qtd</th>
                  <th className="px-2 py-2 text-right font-semibold">Unitario</th>
                  <th className="px-2 py-2 text-right font-semibold">Total</th>
                  <th className="px-2 py-2 text-center font-semibold no-print">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-slate-800 dark:hover:bg-slate-900">
                    <td className="px-2 py-3">{it.description}</td>
                    <td className="px-2 py-3 text-center">{it.unit}</td>
                    <td className="px-2 py-3 text-right">
                      <span className="no-print">
                        <input
                          className="input w-20 text-right"
                          value={String(it.qty)}
                          onChange={(e) => quickUpdateItem(it.id, { qty: toNumber(e.target.value) })}
                        />
                      </span>
                      <span className="print-only">{it.qty}</span>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <span className="no-print">
                        <input
                          className="input w-24 text-right"
                          value={String(it.unit_cost)}
                          onChange={(e) => quickUpdateItem(it.id, { unit_cost: toNumber(e.target.value) })}
                        />
                      </span>
                      <span className="print-only">{fmtBRL(it.unit_cost)}</span>
                    </td>
                    <td className="px-2 py-3 text-right">{fmtBRL(Number(it.qty) * Number(it.unit_cost))}</td>
                    <td className="px-2 py-3 text-center no-print">
                      <button className="btn-ghost" onClick={() => removeItem(it.id)}>
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
                {!items.length ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-6">
                      <div className="text-center text-sm text-gray-500 dark:text-slate-400">Nenhum item.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 text-right text-sm font-semibold text-gray-800 dark:text-slate-200">
            Total do orcamento: {fmtBRL(selectedTotal)}
          </div>

          <div className="print-block mt-8">
            <div className="text-lg font-semibold">Orcamento</div>
            <div className="mt-1 text-sm">Fornecedor: {selectedQuote.supplier_name}</div>
            <div className="text-sm">
              Data:{' '}
              {new Date(selectedQuote.created_at).toLocaleDateString('pt-BR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              })}
            </div>
            {selectedQuote.title ? <div className="text-sm">Titulo: {selectedQuote.title}</div> : null}
            <div className="mt-4 text-sm font-semibold">Total: {fmtBRL(selectedTotal)}</div>
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
