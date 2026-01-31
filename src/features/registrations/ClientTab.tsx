import { useState, useEffect, useMemo } from 'react';
import { Download } from 'lucide-react';
import { exportToCSV } from '../../lib/utils';
import SectionCard from '../../ui/SectionCard';
import ClientTable from './ClientTable';
import ClientForm from './ClientForm';
import { listClients, upsertClient, deleteClient } from '../../lib/db';
import { Client } from '../../lib/types';

const emptyDraft: Partial<Client> & { type: 'PF' | 'PJ' } = {
    name: '',
    type: 'PF',
    document: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    notes: ''
};

export default function ClientTab() {
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState<Client[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');

    const [editing, setEditing] = useState<Partial<Client> | null>(null);
    const [saving, setSaving] = useState(false);

    async function refresh() {
        try {
            setLoading(true);
            setError(null);
            const data = await listClients();
            setClients(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        refresh();
    }, []);

    const filtered = useMemo(() => {
        const q = filter.trim().toLowerCase();
        return clients.filter(c => {
            if (!q) return true;
            const hay = `${c.name} ${c.email || ''} ${c.document || ''}`.toLowerCase();
            return hay.includes(q);
        });
    }, [clients, filter]);

    function beginCreate() {
        setEditing({ ...emptyDraft });
    }

    function beginEdit(c: Client) {
        setEditing({ ...c });
    }

    async function handleSubmit() {
        if (!editing || !editing.name) return;
        try {
            setSaving(true);
            // @ts-ignore
            await upsertClient(editing);
            await refresh();
            setEditing(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(c: Client) {
        if (!confirm(`Excluir ${c.name}?`)) return;
        try {
            await deleteClient(c.id);
            await refresh();
        } catch (e: any) {
            setError(e.message);
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8">
                <SectionCard
                    title={`Clientes (${filtered.length})`}
                    action={
                        <div className="flex gap-2">
                            <input
                                className="px-3 py-1 text-sm border rounded dark:bg-slate-900 dark:border-slate-700"
                                placeholder="Buscar..."
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                            />
                            <button onClick={() => exportToCSV(filtered, 'clientes.csv')} className="btn-ghost text-xs p-1">
                                <Download size={16} />
                            </button>
                        </div>
                    }
                >
                    {loading ? (
                        <p>Carregando...</p>
                    ) : (
                        <ClientTable items={filtered} onEdit={beginEdit} onDelete={handleDelete} />
                    )}
                </SectionCard>
            </div>
            <div className="lg:col-span-4">
                <SectionCard title={editing && editing.id ? 'Editar Cliente' : 'Novo Cliente'}>
                    {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                    <ClientForm
                        draft={editing || emptyDraft}
                        onChange={setEditing}
                        onSubmit={handleSubmit}
                        onCancel={() => setEditing(null)}
                        isSubmitting={saving}
                    />
                </SectionCard>
            </div>
        </div>
    );
}
