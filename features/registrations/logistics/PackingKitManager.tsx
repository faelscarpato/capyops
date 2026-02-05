import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Archive } from 'lucide-react';
import { listPackingKits, upsertPackingKit, listPackingKitItems, upsertPackingKitItem, listSupplies, listAllPackingKitItems, deletePackingKitItem } from '../../../lib/db';
import type { PackingKit } from '../../../lib/types';

export default function PackingKitManager() {
    const [kits, setKits] = useState<PackingKit[]>([]);
    const [supplies, setSupplies] = useState<any[]>([]); // Using any for Supply type to avoid import issues if not exported, but ideally import it
    const [allItems, setAllItems] = useState<any[]>([]); // Same for items
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Partial<PackingKit> | null>(null);

    // Edit Item State
    const [editingItems, setEditingItems] = useState<any[]>([]);
    const [newItemSupplyId, setNewItemSupplyId] = useState('');
    const [newItemQty, setNewItemQty] = useState(1);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const [k, s, it] = await Promise.all([
                listPackingKits(),
                listSupplies(),
                listAllPackingKitItems()
            ]);
            setKits(k);
            setSupplies(s);
            setAllItems(it);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveKit() {
        if (!editing?.name) return;
        await upsertPackingKit({ ...editing, name: editing.name, is_active: true } as any);
        setEditing(null);
        load();
    }

    async function handleEditClick(kit: PackingKit) {
        setEditing(kit);
        // Load specific items for this kit to ensure freshness, or filter from allItems
        // Filtering from allItems is faster for UI, but let's fetch fresh to be safe
        try {
            const items = await listPackingKitItems(kit.id);
            setEditingItems(items);
        } catch {
            setEditingItems([]);
        }
    }

    async function handleAddItem() {
        if (!editing?.id || !newItemSupplyId || newItemQty <= 0) return;
        try {
            await upsertPackingKitItem({
                kit_id: editing.id,
                supply_id: newItemSupplyId,
                qty_per_order: newItemQty
            });
            // Refresh items
            const updated = await listPackingKitItems(editing.id);
            setEditingItems(updated);
            setNewItemSupplyId('');
            setNewItemQty(1);
            // Also refresh all items to update the main card counts
            const all = await listAllPackingKitItems();
            setAllItems(all);
        } catch (e) {
            console.error(e);
            alert('Erro ao adicionar item.');
        }
    }

    async function handleRemoveItem(itemId: string) {
        if (!confirm('Remover este item do kit?')) return;
        try {
            // We need to import deletePackingKitItem. Assuming I just added it.
            // If TS complains about import, I will fix it. 
            // For now, I'll rely on the previous tool call having added it.
            await deletePackingKitItem(itemId);
            if (editing?.id) {
                const updated = await listPackingKitItems(editing.id);
                setEditingItems(updated);
                const all = await listAllPackingKitItems();
                setAllItems(all);
            }
        } catch (e) {
            console.error(e);
            alert('Erro ao remover item.');
        }
    }

    // Calculares
    const kitCounts = kits.reduce((acc, kit) => {
        const count = allItems.filter(i => i.kit_id === kit.id).length;
        acc[kit.id] = count;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center card p-4">
                <h3 className="font-medium text-gray-700 dark:text-gray-200">Kits de Embalagem</h3>
                <button onClick={() => setEditing({})} className="btn-primary flex items-center gap-2 text-xs">
                    <Plus size={14} /> Novo Kit
                </button>
            </div>

            {editing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl flex flex-col">
                        <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                            <h3 className="font-semibold text-lg">{editing.id ? 'Editar Kit' : 'Novo Kit'}</h3>
                            <button onClick={() => setEditing(null)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Nome do Kit */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Nome do Kit</label>
                                <div className="flex gap-2">
                                    <input
                                        className="input flex-1"
                                        value={editing.name || ''}
                                        onChange={e => setEditing({ ...editing, name: e.target.value })}
                                        placeholder="Ex: Kit Envio Padrão"
                                    />
                                    <button onClick={handleSaveKit} className="btn-primary">Salvar Nome</button>
                                </div>
                            </div>

                            {/* Itens do Kit (Só mostra se já salvou o kit/tem ID) */}
                            {editing.id && (
                                <div className="border-t pt-4 dark:border-slate-700">
                                    <h4 className="font-medium text-sm mb-3 text-gray-700 dark:text-gray-300">Itens do Kit (Insumos)</h4>

                                    {/* Add Item Form */}
                                    <div className="card p-3 mb-4 flex flex-wrap gap-2 items-end">
                                        <div className="flex-1 min-w-[200px]">
                                            <div className="text-xs mb-1 text-gray-500">Insumo</div>
                                            <select
                                                className="input w-full text-sm"
                                                value={newItemSupplyId}
                                                onChange={e => setNewItemSupplyId(e.target.value)}
                                            >
                                                <option value="">Selecione...</option>
                                                {supplies.map(s => <option key={s.id} value={s.id}>{s.name} ({s.unit})</option>)}
                                            </select>
                                        </div>
                                        <div className="w-24">
                                            <div className="text-xs mb-1 text-gray-500">Qtd</div>
                                            <input
                                                type="number"
                                                className="input w-full text-sm"
                                                value={newItemQty}
                                                onChange={e => setNewItemQty(Number(e.target.value))}
                                                min="0.1" step="0.1"
                                            />
                                        </div>
                                        <button onClick={handleAddItem} className="btn-secondary text-sm h-[38px] px-4">
                                            <Plus size={16} /> Adicionar
                                        </button>
                                    </div>

                                    {/* Items List */}
                                    <div className="card overflow-hidden">
                                        <div className="table-scroll">
                                        <table className="table-base w-full text-left">
                                            <thead>
                                                <tr>
                                                    <th>Insumo</th>
                                                    <th className="text-right">Qtd</th>
                                                    <th className="text-center">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {editingItems.map(item => {
                                                    const supply = supplies.find(s => s.id === item.supply_id);
                                                    return (
                                                        <tr key={item.id}>
                                                            <td>{supply?.name || '???'}</td>
                                                            <td className="text-right">{item.qty_per_order}</td>
                                                            <td className="text-center">
                                                                <button
                                                                    onClick={() => handleRemoveItem(item.id)}
                                                                    className="btn-ghost p-1 text-red-500"
                                                                    title="Remover"
                                                                >
                                                                    <Archive size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {editingItems.length === 0 && (
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-8 text-center text-gray-400 italic">
                                                            Nenhum item adicionado a este kit.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!editing.id && (
                            <div className="text-center py-6 text-gray-500 text-sm card border border-dashed dark:border-slate-700">
                                Salve o kit primeiro para adicionar itens.
                            </div>
                            )}
                        </div>

                        <div className="p-4 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 flex justify-end">
                            <button onClick={() => setEditing(null)} className="btn-primary">Concluir</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {kits.map(kit => (
                    <div key={kit.id} className="card p-4 relative group">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-cyan-100 text-cyan-700 rounded-lg dark:bg-cyan-900/30 dark:text-cyan-400">
                                    <Archive size={20} />
                                </div>
                                <div>
                                    <span className="font-semibold text-gray-800 dark:text-gray-100 block">{kit.name}</span>
                                    <span className="text-xs text-gray-400">ID: {kit.id.slice(0, 8)}</span>
                                </div>
                            </div>
                            <button onClick={() => handleEditClick(kit)} className="btn-ghost p-1 text-gray-400 hover:text-cyan-500">
                                <Edit2 size={16} />
                            </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-xs">
                            <span className="text-gray-500 dark:text-gray-400">Itens no kit:</span>
                            <span className="badge badge-neutral">
                                {kitCounts[kit.id] || 0} items
                            </span>
                        </div>
                    </div>
                ))}
                {kits.length === 0 && !loading && (
                    <div className="col-span-full text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-lg dark:border-slate-700">
                        <Archive size={48} className="mx-auto mb-2 opacity-20" />
                        <p>Nenhum kit de embalagem cadastrado.</p>
                        <button onClick={() => setEditing({})} className="btn-ghost mt-2 text-sm">Criar o primeiro</button>
                    </div>
                )}
            </div>
        </div>
    );
}


