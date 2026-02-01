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
            <div className="flex justify-between items-center card p-4">
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
                <div className="card p-4">
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

            <div className="card overflow-hidden">
                <div className="table-scroll">
                <table className="table-base w-full text-left">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Categoria</th>
                            <th className="text-right">Custo</th>
                            <th className="text-center">Estoque</th>
                            <th className="text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(item => (
                            <tr key={item.id}>
                                <td className="font-medium">{item.name}</td>
                                <td><span className="badge badge-neutral">{item.category}</span></td>
                                <td className="text-right">R$ {item.cost_per_unit?.toFixed(2)}</td>
                                <td className="text-center">
                                    <span className={item.stock_qty <= (item.min_qty || 0) ? 'badge badge-danger' : 'badge badge-success'}>
                                        {item.stock_qty}
                                    </span>
                                </td>
                                <td className="text-right flex justify-end gap-2">
                                    <button onClick={() => setEditing(item)} className="btn-ghost p-1 text-blue-500"><Edit2 size={14} /></button>
                                    <button onClick={() => handleToggle(item)} className="btn-ghost p-1 text-red-500"><Trash2 size={14} /></button>
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
        </div>
    );
}


