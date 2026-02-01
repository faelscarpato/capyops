import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Download } from 'lucide-react';
import { exportToCSV } from '../../../lib/utils';
import { listExpenses, addExpense } from '../../../lib/db';
import type { Expense } from '../../../lib/types';

export default function ExpenseManager() {
    const [items, setItems] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<Partial<Expense> | null>(null);
    const [filter, setFilter] = useState('');

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        const data = await listExpenses();
        setItems(data);
        setLoading(false);
    }

    // Filter logic
    const filtered = items.filter(i => {
        if (!filter) return true;
        const s = filter.toLowerCase();
        return (
            i.category.toLowerCase().includes(s) ||
            (i.vendor || '').toLowerCase().includes(s) ||
            (i.notes || '').toLowerCase().includes(s)
        );
    });

    async function handleSave() {
        if (!editing?.category || !editing.amount) return;
        try {
            await addExpense({
                category: editing.category,
                amount: Number(editing.amount),
                vendor: editing.vendor,
                notes: editing.notes,
                payment_method: editing.payment_method,
                paid_at: editing.paid_at
            });
            setEditing(null);
            load();
        } catch (e) {
            alert('Erro ao salvar despesa');
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center card p-4">
                <h3 className="font-medium">Despesas Operacionais</h3>
                <div className="flex gap-2 items-center">
                    <div className="relative">
                        <Search className="absolute left-2 top-1.5 text-gray-400 w-4 h-4" />
                        <input
                            className="input w-full pl-8 sm:w-48"
                            placeholder="Filtrar..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />
                    </div>
                    <button onClick={() => exportToCSV(filtered, 'despesas.csv')} className="btn-ghost text-xs flex items-center gap-1">
                        <Download size={14} /> CSV
                    </button>
                    <button onClick={() => setEditing({})} className="btn-primary flex items-center gap-2 text-xs">
                        <Plus size={14} /> Nova Despesa
                    </button>
                </div>
            </div>

            {editing && (
                <div className="card p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <label className="text-xs block">Categoria
                            <input className="input w-full mt-1" value={editing.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value })} />
                        </label>
                        <label className="text-xs block">Valor
                            <input type="number" className="input w-full mt-1" value={editing.amount || ''} onChange={e => setEditing({ ...editing, amount: Number(e.target.value) })} />
                        </label>
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
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
                            <th>Data</th>
                            <th>Categoria</th>
                            <th>Fornecedor</th>
                            <th className="text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(ex => (
                            <tr key={ex.id}>
                                <td>{new Date(ex.paid_at).toLocaleDateString()}</td>
                                <td>{ex.category}</td>
                                <td className="table-muted">{ex.vendor || '-'}</td>
                                <td className="text-right font-medium">R$ {ex.amount.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
        </div>
    );
}


