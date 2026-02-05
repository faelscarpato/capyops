import { useState, useEffect } from 'react';
import { Plus, FileText } from 'lucide-react';
import { listPurchaseQuotes, createPurchaseQuote, updatePurchaseQuote } from '../../../lib/db';
import type { PurchaseQuote } from '../../../lib/types';
import StatusChip from '../../../ui/StatusChip';

export default function PurchaseQuoteManager() {
    const [quotes, setQuotes] = useState<PurchaseQuote[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<PurchaseQuote | null>(null);

    // Form State
    const [supplierName, setSupplierName] = useState('');
    const [title, setTitle] = useState('');
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState('draft');

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        const data = await listPurchaseQuotes();
        setQuotes(data);
        setLoading(false);
    }

    async function handleCreate() {
        if (!supplierName) return alert('Fornecedor obrigatório');
        await createPurchaseQuote({ supplier_name: supplierName, title, notes, status: 'draft' });
        setShowForm(false);
        setSupplierName('');
        setTitle('');
        setNotes('');
        setStatus('draft');
        load();
    }

    async function handleUpdate() {
        if (!editing) return;
        if (!supplierName) return alert('Fornecedor obrigatório');
        await updatePurchaseQuote(editing.id, {
            supplier_name: supplierName,
            title: title || null,
            notes: notes || null,
            status
        });
        setEditing(null);
        setShowForm(false);
        setSupplierName('');
        setTitle('');
        setNotes('');
        setStatus('draft');
        load();
    }

    function beginEdit(q: PurchaseQuote) {
        setEditing(q);
        setShowForm(true);
        setSupplierName(q.supplier_name);
        setTitle(q.title || '');
        setNotes(q.notes || '');
        setStatus(q.status || 'draft');
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center card p-4">
                <h3 className="font-medium text-gray-700 dark:text-gray-200">Orçamentos e Cotações</h3>
                <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-xs">
                    <Plus size={14} /> Novo Orçamento
                </button>
            </div>

            {showForm && (
                <div className="bg-gray-50 p-4 rounded-lg border dark:bg-slate-800/50 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <label className="block text-xs">
                            Nome do Fornecedor *
                            <input className="input w-full mt-1" value={supplierName} onChange={e => setSupplierName(e.target.value)} />
                        </label>
                        <label className="block text-xs">
                            Título / Referência
                            <input className="input w-full mt-1" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Cotação Placas Jan/26" />
                        </label>
                        <label className="block text-xs">
                            Status
                            <select className="input w-full mt-1" value={status} onChange={e => setStatus(e.target.value)}>
                                <option value="draft">Rascunho</option>
                                <option value="sent">Enviado</option>
                                <option value="approved">Aprovado</option>
                                <option value="rejected">Rejeitado</option>
                            </select>
                        </label>
                        <label className="block text-xs col-span-full">
                            Observações
                            <textarea className="input w-full mt-1" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
                        </label>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => { setShowForm(false); setEditing(null); }} className="btn-ghost text-xs">Cancelar</button>
                        {editing ? (
                            <button onClick={handleUpdate} className="btn-primary text-xs">Salvar Alterações</button>
                        ) : (
                            <button onClick={handleCreate} className="btn-primary text-xs">Criar Rascunho</button>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quotes.map(q => (
                    <div key={q.id} className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 hover:border-cyan-200 transition-colors dark:bg-slate-900 dark:border-slate-800">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg dark:bg-blue-900/20">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">{q.supplier_name}</h4>
                                    <p className="text-xs text-gray-500">{q.title || 'Sem título'}</p>
                                </div>
                            </div>
                            <StatusChip status={q.status} />
                        </div>
                        <div className="text-xs text-gray-500">{q.notes || 'Sem observações'}</div>
                        <div className="text-xs text-right text-gray-400 mt-2">
                            {new Date(q.created_at).toLocaleDateString()}
                        </div>
                        <div className="mt-3 flex justify-end">
                            <button className="btn-ghost text-xs" onClick={() => beginEdit(q)}>Editar</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

