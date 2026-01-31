import { useState, useEffect } from 'react';
import { Search, Save, Scale } from 'lucide-react';
import { listProducts, updateProduct } from '../../../lib/db';
import type { Product } from '../../../lib/types';
import StatusChip from '../../../ui/StatusChip';

export default function ProductWeightManager() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [edits, setEdits] = useState<Record<string, number>>({});

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        const data = await listProducts();
        setProducts(data);
        setLoading(false);
    }

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase())
    );

    async function handleSave(id: string) {
        const newWeight = edits[id];
        if (newWeight === undefined) return;
        try {
            await updateProduct(id, { weight_kg: newWeight });
            // Update local state
            setProducts(products.map(p => p.id === id ? { ...p, weight_kg: newWeight } : p));
            const newEdits = { ...edits };
            delete newEdits[id];
            setEdits(newEdits);
        } catch (e) {
            alert('Erro ao salvar peso');
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm dark:bg-slate-800">
                <div className="flex gap-2 items-center w-1/2">
                    <Search className="w-4 h-4 text-gray-500" />
                    <input
                        className="bg-transparent border-none focus:ring-0 w-full text-sm"
                        placeholder="Buscar produtos para pesar..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden dark:bg-slate-900 border dark:border-slate-800">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-slate-800/50 text-xs uppercase text-gray-500 font-medium">
                        <tr>
                            <th className="p-3">Produto</th>
                            <th className="p-3 text-center">SKU</th>
                            <th className="p-3 text-center">Peso Atual (kg)</th>
                            <th className="p-3 text-right">Novo Peso (kg)</th>
                            <th className="p-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {filtered.map(p => {
                            const hasEdit = edits[p.id] !== undefined;
                            return (
                                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30">
                                    <td className="p-3">
                                        <div className="font-medium text-gray-900 dark:text-gray-100">{p.name}</div>
                                        <div className="text-xs text-gray-400">{p.variant}</div>
                                    </td>
                                    <td className="p-3 text-center text-xs text-gray-500">{p.sku || '-'}</td>
                                    <td className="p-3 text-center">
                                        <span className="flex items-center justify-center gap-1 text-gray-600 dark:text-gray-300">
                                            <Scale size={14} />
                                            {p.weight_kg ? p.weight_kg.toFixed(3) : '—'}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right">
                                        <input
                                            type="number"
                                            step="0.001"
                                            className="input w-24 text-right h-8"
                                            placeholder="0.000"
                                            value={edits[p.id] !== undefined ? edits[p.id] : ''}
                                            onChange={e => setEdits({ ...edits, [p.id]: parseFloat(e.target.value) })}
                                        />
                                    </td>
                                    <td className="p-3 text-center">
                                        {hasEdit && (
                                            <button onClick={() => handleSave(p.id)} className="text-cyan-600 hover:bg-cyan-50 p-1 rounded">
                                                <Save size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
