import { Edit3, Trash2 } from 'lucide-react';
import { Client } from '../../lib/types';

type Props = {
    items: Client[];
    onEdit: (c: Client) => void;
    onDelete: (c: Client) => void;
};

export default function ClientTable({ items, onEdit, onDelete }: Props) {
    return (
        <div className="table-scroll">
            <table className="table-base min-w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-slate-800/60 dark:text-slate-300">
                    <tr>
                        <th className="px-3 py-2 text-left">Nome</th>
                        <th className="px-3 py-2 text-left">Documento</th>
                        <th className="px-3 py-2 text-left">Contato</th>
                        <th className="px-3 py-2 text-left">Local</th>
                        <th className="px-3 py-2 text-right">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {items.map((c) => (
                        <tr key={c.id}>
                            <td className="px-3 py-2">
                                <div className="font-medium text-gray-900 dark:text-slate-100">{c.name}</div>
                                <div className="text-xs text-gray-500">{c.type}</div>
                            </td>
                            <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{c.document || '—'}</td>
                            <td className="px-3 py-2">
                                <div className="text-gray-700 dark:text-slate-300">{c.email}</div>
                                <div className="text-xs text-gray-500">{c.phone}</div>
                            </td>
                            <td className="px-3 py-2 text-gray-700 dark:text-slate-300">
                                {c.city && c.state ? `${c.city}/${c.state}` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => onEdit(c)} className="btn-ghost p-1"><Edit3 className="w-4 h-4" /></button>
                                    <button onClick={() => onDelete(c)} className="btn-ghost p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}


