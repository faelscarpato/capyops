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
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm dark:bg-slate-800">
                <h3 className="font-medium">Despesas Operacionais</h3>
                <div className="flex gap-2 items-center">
                    <div className="relative">
                        <Search className="absolute left-2 top-1.5 text-gray-400 w-4 h-4" />
                        <input
                            className="pl-8 pr-2 py-1 text-sm border rounded dark:bg-slate-900 dark:border-slate-700 w-48"
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
                <div className="bg-gray-50 p-4 rounded-lg border dark:bg-slate-800/50">
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

            <div className="bg-white rounded-lg shadow-sm overflow-hidden dark:bg-slate-900 border dark:border-slate-800">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-slate-800/50 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="p-3">Data</th>
                            <th className="p-3">Categoria</th>
                            <th className="p-3">Fornecedor</th>
                            <th className="p-3 text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.map(ex => (
                            <tr key={ex.id}>
                                <td className="p-3">{new Date(ex.paid_at).toLocaleDateString()}</td>
                                <td className="p-3">{ex.category}</td>
                                <td className="p-3">{ex.vendor || '-'}</td>
                                <td className="p-3 text-right font-medium">R$ {ex.amount.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
