import { useEffect, useMemo, useState } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import {
  addPurchaseQuoteItem,
  createPurchaseQuote,
  deletePurchaseQuoteItem,
  listProducts,
  listPurchaseQuoteItems,
  listPurchaseQuotes,
  listSupplies,
  updatePurchaseQuote,
  updatePurchaseQuoteItem
} from '../../../lib/db';
import type { Product, PurchaseQuote, PurchaseQuoteItem, Supply } from '../../../lib/types';
import StatusChip from '../../../ui/StatusChip';
import { Button } from '../../../ui/primitives/Button';

type ItemSource = 'product' | 'supply';

const initialForm = {
  supplierName: '',
  title: '',
  notes: '',
  status: 'draft'
};

export default function PurchaseQuoteManager() {
  const [quotes, setQuotes] = useState<PurchaseQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PurchaseQuote | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  const [supplierName, setSupplierName] = useState(initialForm.supplierName);
  const [title, setTitle] = useState(initialForm.title);
  const [notes, setNotes] = useState(initialForm.notes);
  const [status, setStatus] = useState(initialForm.status);

  const [products, setProducts] = useState<Product[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [quoteItems, setQuoteItems] = useState<PurchaseQuoteItem[]>([]);
  const [itemSource, setItemSource] = useState<ItemSource>('product');
  const [productId, setProductId] = useState('');
  const [supplyId, setSupplyId] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('un');
  const [qty, setQty] = useState('1');
  const [unitCost, setUnitCost] = useState('0');

  const selectedQuote = useMemo(
    () => quotes.find((quote) => quote.id === selectedQuoteId) ?? null,
    [quotes, selectedQuoteId]
  );

  const total = useMemo(
    () => quoteItems.reduce((sum, item) => sum + Number(item.qty ?? 0) * Number(item.unit_cost ?? 0), 0),
    [quoteItems]
  );

  useEffect(() => {
    void load();
    void loadCatalogSources();
  }, []);

  useEffect(() => {
    if (!selectedQuoteId) {
      setQuoteItems([]);
      return;
    }
    void loadItems(selectedQuoteId);
  }, [selectedQuoteId]);

  async function load() {
    setLoading(true);
    try {
      const data = await listPurchaseQuotes();
      setQuotes(data);
      if (!selectedQuoteId && data.length) {
        setSelectedQuoteId(data[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalogSources() {
    const [productsData, suppliesData] = await Promise.all([listProducts({ includeInactive: true }), listSupplies()]);
    setProducts(productsData);
    setSupplies(suppliesData);
  }

  async function loadItems(quoteId: string) {
    const data = await listPurchaseQuoteItems(quoteId);
    setQuoteItems(data);
  }

  function resetQuoteForm() {
    setSupplierName(initialForm.supplierName);
    setTitle(initialForm.title);
    setNotes(initialForm.notes);
    setStatus(initialForm.status);
    setEditing(null);
    setShowForm(false);
  }

  function resetItemForm() {
    setItemSource('product');
    setProductId('');
    setSupplyId('');
    setDescription('');
    setUnit('un');
    setQty('1');
    setUnitCost('0');
  }

  async function handleCreateQuote() {
    if (!supplierName.trim()) {
      alert('Fornecedor obrigatório');
      return;
    }
    const created = await createPurchaseQuote({
      supplier_name: supplierName.trim(),
      title: title.trim() || null,
      notes: notes.trim() || null,
      status: 'draft'
    });
    await load();
    setSelectedQuoteId(created.id);
    resetQuoteForm();
  }

  async function handleUpdateQuote() {
    if (!editing) return;
    if (!supplierName.trim()) {
      alert('Fornecedor obrigatório');
      return;
    }
    await updatePurchaseQuote(editing.id, {
      supplier_name: supplierName.trim(),
      title: title.trim() || null,
      notes: notes.trim() || null,
      status
    });
    await load();
    resetQuoteForm();
  }

  function beginEdit(quote: PurchaseQuote) {
    setEditing(quote);
    setShowForm(true);
    setSupplierName(quote.supplier_name);
    setTitle(quote.title || '');
    setNotes(quote.notes || '');
    setStatus(quote.status || 'draft');
  }

  async function handleAddItem() {
    if (!selectedQuoteId) {
      alert('Selecione um orçamento.');
      return;
    }
    const qtyNumber = Math.max(1, Number(qty) || 1);
    const unitCostNumber = Math.max(0, Number(unitCost) || 0);
    const finalDescription = description.trim();
    if (!finalDescription) {
      alert('Descrição do item obrigatória.');
      return;
    }

    await addPurchaseQuoteItem({
      quote_id: selectedQuoteId,
      product_id: itemSource === 'product' ? productId || null : null,
      supply_id: itemSource === 'supply' ? supplyId || null : null,
      description: finalDescription,
      unit: unit.trim() || 'un',
      qty: qtyNumber,
      unit_cost: unitCostNumber
    });

    await loadItems(selectedQuoteId);
    resetItemForm();
  }

  async function handleUpdateItem(itemId: string, patch: Partial<PurchaseQuoteItem>) {
    await updatePurchaseQuoteItem(itemId, patch);
    if (selectedQuoteId) await loadItems(selectedQuoteId);
  }

  async function handleDeleteItem(itemId: string) {
    await deletePurchaseQuoteItem(itemId);
    if (selectedQuoteId) await loadItems(selectedQuoteId);
  }

  function onSelectProduct(nextId: string) {
    setItemSource('product');
    setProductId(nextId);
    const selected = products.find((product) => product.id === nextId);
    if (!selected) return;
    setDescription(`${selected.name} ${selected.size_cm ? `${selected.size_cm}cm` : ''} • ${selected.variant}`.trim());
    setUnit('un');
    setUnitCost(String(Number(selected.cost ?? 0)));
  }

  function onSelectSupply(nextId: string) {
    setItemSource('supply');
    setSupplyId(nextId);
    const selected = supplies.find((supply) => supply.id === nextId);
    if (!selected) return;
    setDescription(selected.name);
    setUnit(selected.unit || 'un');
    setUnitCost(String(Number(selected.cost_per_unit ?? 0)));
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-medium text-fg">Orçamentos e Cotações</h3>
          <Button type="button" variant="primary" size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Novo Orçamento
          </Button>
        </div>
      </div>

      {showForm ? (
        <div className="rounded-lg border border-default bg-surface-2 p-4">
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block text-xs">
              Nome do Fornecedor *
              <input className="input mt-1 w-full" value={supplierName} onChange={(event) => setSupplierName(event.target.value)} />
            </label>
            <label className="block text-xs">
              Título / Referência
              <input
                className="input mt-1 w-full"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex: Cotação Placas Jan/26"
              />
            </label>
            <label className="block text-xs">
              Status
              <select className="input mt-1 w-full" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="draft">Rascunho</option>
                <option value="sent">Enviado</option>
                <option value="approved">Aprovado</option>
                <option value="rejected">Rejeitado</option>
              </select>
            </label>
            <label className="col-span-full block text-xs">
              Observações
              <textarea className="input mt-1 w-full" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={resetQuoteForm}>
              Cancelar
            </Button>
            {editing ? (
              <Button type="button" variant="primary" size="sm" onClick={handleUpdateQuote}>
                Salvar Alterações
              </Button>
            ) : (
              <Button type="button" variant="primary" size="sm" onClick={handleCreateQuote}>
                Criar Rascunho
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {quotes.map((quote) => (
          <div key={quote.id} className="rounded-lg border border-default bg-surface p-4 shadow-card">
            <div className="mb-2 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-default bg-surface-2 p-2 text-[color:var(--primary)]">
                  <FileText size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-fg">{quote.supplier_name}</h4>
                  <p className="text-xs text-muted">{quote.title || 'Sem título'}</p>
                </div>
              </div>
              <StatusChip status={quote.status} />
            </div>

            <div className="text-xs text-muted">{quote.notes || 'Sem observações'}</div>
            <div className="mt-2 text-right text-xs text-muted-2">{new Date(quote.created_at).toLocaleDateString()}</div>

            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => beginEdit(quote)}>
                Editar
              </Button>
              <Button type="button" variant={selectedQuoteId === quote.id ? 'secondary' : 'ghost'} size="sm" onClick={() => setSelectedQuoteId(quote.id)}>
                Itens
              </Button>
            </div>
          </div>
        ))}
      </div>

      {!loading && !quotes.length ? (
        <div className="rounded-lg border border-dashed border-default bg-surface p-4 text-sm text-muted">
          Nenhum orçamento cadastrado.
        </div>
      ) : null}

      {selectedQuote ? (
        <div className="space-y-3 rounded-lg border border-default bg-surface p-4 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-fg">Itens do orçamento</div>
              <div className="text-xs text-muted">
                Fornecedor: {selectedQuote.supplier_name}
              </div>
            </div>
            <div className="text-sm font-semibold text-fg">
              Total: {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>

          <div className="rounded-lg border border-default bg-surface-2 p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Adicionar item</div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
              <div className="md:col-span-2">
                <select className="input" value={itemSource} onChange={(event) => setItemSource(event.target.value as ItemSource)}>
                  <option value="product">Produto</option>
                  <option value="supply">Insumo</option>
                </select>
              </div>

              {itemSource === 'product' ? (
                <div className="md:col-span-4">
                  <select className="input" value={productId} onChange={(event) => onSelectProduct(event.target.value)}>
                    <option value="">Selecionar produto...</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} {product.variant ? `• ${product.variant}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="md:col-span-4">
                  <select className="input" value={supplyId} onChange={(event) => onSelectSupply(event.target.value)}>
                    <option value="">Selecionar insumo...</option>
                    {supplies.map((supply) => (
                      <option key={supply.id} value={supply.id}>
                        {supply.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="md:col-span-3">
                <input
                  className="input"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Descrição no orçamento"
                />
              </div>
              <div className="md:col-span-1">
                <input className="input" value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="Un" />
              </div>
              <div className="md:col-span-1">
                <input className="input" value={qty} onChange={(event) => setQty(event.target.value)} inputMode="decimal" placeholder="Qtd" />
              </div>
              <div className="md:col-span-1">
                <input className="input" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} inputMode="decimal" placeholder="Valor" />
              </div>
            </div>

            <div className="mt-2 flex justify-end">
              <Button type="button" variant="primary" size="sm" onClick={handleAddItem}>
                <Plus size={14} /> Adicionar item
              </Button>
            </div>
          </div>

          <div className="table-scroll">
            <table className="table-base w-full min-w-[680px] text-left">
              <thead>
                <tr>
                  <th className="px-2 py-2 font-semibold">Descrição</th>
                  <th className="px-2 py-2 text-center font-semibold">Un</th>
                  <th className="px-2 py-2 text-right font-semibold">Qtd</th>
                  <th className="px-2 py-2 text-right font-semibold">Unitário</th>
                  <th className="px-2 py-2 text-right font-semibold">Total</th>
                  <th className="px-2 py-2 text-center font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {quoteItems.map((item) => {
                  const lineTotal = Number(item.qty ?? 0) * Number(item.unit_cost ?? 0);
                  return (
                    <tr key={item.id}>
                      <td className="px-2 py-2">
                        <input
                          className="input"
                          value={item.description}
                          onChange={(event) => void handleUpdateItem(item.id, { description: event.target.value })}
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          className="input text-center"
                          value={item.unit}
                          onChange={(event) => void handleUpdateItem(item.id, { unit: event.target.value })}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          className="input text-right"
                          inputMode="decimal"
                          value={String(item.qty)}
                          onChange={(event) => void handleUpdateItem(item.id, { qty: Number(event.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input
                          className="input text-right"
                          inputMode="decimal"
                          value={String(item.unit_cost)}
                          onChange={(event) => void handleUpdateItem(item.id, { unit_cost: Number(event.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        {lineTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Button type="button" variant="ghost" size="sm" onClick={() => void handleDeleteItem(item.id)}>
                          <Trash2 className="h-4 w-4 text-[color:var(--danger)]" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {!quoteItems.length ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-6 text-center text-sm text-muted">
                      Nenhum item neste orçamento.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
