import { useState, useEffect } from 'react';
import { listExpenses } from '../../../lib/db';
import type { Expense } from '../../../lib/types';
import { Download, Filter, TrendingDown } from 'lucide-react';

function exportToCSV(data: any[], filename: string) {
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

export default function PaymentManager() {
    const [items, setItems] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        const data = await listExpenses();
        setItems(data);
        setLoading(false);
    }

    const total = items.reduce((acc, i) => acc + i.amount, 0);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center card p-4">
                <div>
                    <h3 className="font-medium flex items-center gap-2">
                        <TrendingDown className="text-red-500" size={18} />
                        Pagamentos Realizados
                    </h3>
                    <p className="text-xs text-gray-500">Histórico de saídas financeiras.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => exportToCSV(items, 'pagamentos.csv')} className="btn-ghost text-xs flex items-center gap-1">
                        <Download size={14} /> CSV
                    </button>
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="table-scroll">
                <table className="table-base w-full text-left">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Descrição</th>
                            <th>Categoria</th>
                            <th>Método</th>
                            <th className="text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map(item => (
                            <tr key={item.id}>
                                <td className="table-muted">{new Date(item.paid_at).toLocaleDateString()}</td>
                                <td className="font-medium">{item.notes || 'Sem descrição'} <div className="text-xs font-normal text-gray-400">{item.vendor}</div></td>
                                <td><span className="badge badge-neutral">{item.category}</span></td>
                                <td className="table-muted">{item.payment_method}</td>
                                <td className="text-right font-medium text-red-600">- R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-50 dark:bg-slate-800/50 font-semibold text-gray-700">
                        <tr>
                            <td colSpan={4} className="text-right">TOTAL</td>
                            <td className="text-right text-red-600">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tfoot>
                </table>
                </div>
            </div>
        </div>
    );
}


