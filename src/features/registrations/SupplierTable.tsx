import { Edit3, Trash2 } from 'lucide-react';
import { Supplier } from '../../lib/types';

type Props = {
    items: Supplier[];
    onEdit: (s: Supplier) => void;
    onDelete: (s: Supplier) => void;
};

export default function SupplierTable({ items, onEdit, onDelete }: Props) {
    return (
        <div className="table-scroll">
            <table className="table-base min-w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-800/60 dark:text-slate-300">
                    <tr>
                        <th className="px-3 py-2 text-left">Empresa</th>
                        <th className="px-3 py-2 text-left">Contato</th>
                        <th className="px-3 py-2 text-left">Lead Time</th>
                        <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {items.map((s) => (
                        <tr key={s.id}>
                            <td className="px-3 py-2">
                                <div className="font-medium text-gray-900 dark:text-slate-100">{s.name}</div>
                                <div className="text-xs text-gray-500">{s.doc_cnpj || 'Sem Doc'}</div>
                            </td>
                            <td className="px-3 py-2">
                                <div className="text-gray-900 dark:text-slate-100">{s.contact_name}</div>
                                <div className="text-xs text-gray-500">{s.email}</div>
                            </td>
                            <td className="px-3 py-2 text-gray-700 dark:text-slate-300">
                                {s.lead_time_days ? `${s.lead_time_days} dias` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => onEdit(s)} className="btn-ghost p-1"><Edit3 className="w-4 h-4" /></button>
                                    <button onClick={() => onDelete(s)} className="btn-ghost p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}


