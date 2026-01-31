import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Trash2, Edit2, FileDown } from 'lucide-react';
import { listSupplies, upsertSupply, updateSupply } from '../../../lib/db';
import type { Supply } from '../../../lib/types';
import SectionCard from '../../../ui/SectionCard';
import StatusChip from '../../../ui/StatusChip';
import { exportToCSV, exportToPDF } from '../../../lib/utils'; // Assuming these exist or I will create inline

// Helper for export if utils don't exist
function exportTableToCSV(data: any[], filename: string) {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csvKey = [headers, ...rows].join('\n');
    const blob = new Blob([csvKey], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}

export default function SupplyManager() {
    const [items, setItems] = useState<Supply[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<Partial<Supply> | null>(null);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        setLoading(true);
        try {
            const data = await listSupplies();
            setItems(data);
        } finally {
            setLoading(false);
        }
    }

    const filtered = items.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.category.toLowerCase().includes(search.toLowerCase())
    );

    async function handleSave() {
        if (!editing || !editing.name) return;
        try {
            await upsertSupply({
                ...editing,
                name: editing.name!,
                category: editing.category || 'Geral',
                unit: editing.unit || 'un',
                is_active: true
            } as any);
            setEditing(null);
            load();
        } catch (e) {
            alert('Erro ao salvar');
        }
    }

    async function handleToggle(item: Supply) {
        await updateSupply(item.id, { is_active: !item.is_active }); // Assuming updateSupply exists
        load();
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm dark:bg-slate-800">
                <div className="flex gap-2 items-center w-1/2">
                    <Search className="w-4 h-4 text-gray-500" />
                    <input
                        className="bg-transparent border-none focus:ring-0 w-full text-sm"
                        placeholder="Buscar insumos..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <button onClick={() => exportTableToCSV(filtered, 'insumos.csv')} className="btn-ghost flex items-center gap-2 text-xs">
                        <FileDown size={14} /> Exportar
                    </button>
                    <button onClick={() => setEditing({})} className="btn-primary flex items-center gap-2 text-xs">
                        <Plus size={14} /> Novo Insumo
                    </button>
                </div>
            </div>

            {editing && (
                <div className="bg-gray-50 p-4 rounded-lg border dark:bg-slate-800/50 dark:border-slate-700">
                    <h3 className="font-semibold text-sm mb-4">{editing.id ? 'Editar' : 'Novo'} Insumo</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <label className="block text-xs">
                            Nome
                            <input className="input w-full mt-1" value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                        </label>
                        <label className="block text-xs">
                            Categoria
                            <input className="input w-full mt-1" value={editing.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value })} />
                        </label>
                        <label className="block text-xs">
                            Custo Unit.
                            <input type="number" className="input w-full mt-1" value={editing.cost_per_unit || 0} onChange={e => setEditing({ ...editing, cost_per_unit: Number(e.target.value) })} />
                        </label>
                        <label className="block text-xs">
                            Estoque
                            <input type="number" className="input w-full mt-1" value={editing.stock_qty || 0} onChange={e => setEditing({ ...editing, stock_qty: Number(e.target.value) })} />
                        </label>
                    </div>
                    <div className="flex gap-2 mt-4 justify-end">
                        <button onClick={() => setEditing(null)} className="btn-ghost text-xs">Cancelar</button>
                        <button onClick={handleSave} className="btn-primary text-xs">Salvar</button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-sm overflow-hidden dark:bg-slate-900 border dark:border-slate-800">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-slate-800/50 text-xs uppercase text-gray-500 font-medium">
                        <tr>
                            <th className="p-3">Nome</th>
                            <th className="p-3">Categoria</th>
                            <th className="p-3 text-right">Custo</th>
                            <th className="p-3 text-center">Estoque</th>
                            <th className="p-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {filtered.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                                <td className="p-3 font-medium">{item.name}</td>
                                <td className="p-3"><span className="px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs dark:bg-slate-800 dark:text-gray-400">{item.category}</span></td>
                                <td className="p-3 text-right">R$ {item.cost_per_unit?.toFixed(2)}</td>
                                <td className="p-3 text-center">
                                    <span className={item.stock_qty <= (item.min_qty || 0) ? 'text-red-500 font-bold' : 'text-green-500'}>
                                        {item.stock_qty}
                                    </span>
                                </td>
                                <td className="p-3 text-right flex justify-end gap-2">
                                    <button onClick={() => setEditing(item)} className="p-1 hover:bg-gray-200 rounded text-blue-500"><Edit2 size={14} /></button>
                                    <button onClick={() => handleToggle(item)} className="p-1 hover:bg-gray-200 rounded text-red-500"><Trash2 size={14} /></button>
                                </td>
                            </tr>
                        ))}
                        {filtered.length === 0 && (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400">Nenhum insumo encontrado.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
