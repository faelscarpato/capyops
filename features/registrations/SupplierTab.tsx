import { useState, useEffect, useMemo } from 'react';
import { Download } from 'lucide-react';
import { exportToCSV } from '../../lib/utils';
import SectionCard from '../../ui/SectionCard';
import SupplierTable from './SupplierTable';
import SupplierForm from './SupplierForm';
import { listSuppliers, upsertSupplier, deleteSupplier } from '../../lib/db';
import { Supplier } from '../../lib/types';

const emptyDraft: Partial<Supplier> = {
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    doc_cnpj: '',
    address: '',
    lead_time_days: 0,
    notes: ''
};

export default function SupplierTab() {
    const [loading, setLoading] = useState(true);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('');

    const [editing, setEditing] = useState<Partial<Supplier> | null>(null);
    const [saving, setSaving] = useState(false);

    async function refresh() {
        try {
            setLoading(true);
            setError(null);
            const data = await listSuppliers();
            setSuppliers(data);
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
        return suppliers.filter(s => {
            if (!q) return true;
            const hay = `${s.name} ${s.contact_name || ''} ${s.email || ''}`.toLowerCase();
            return hay.includes(q);
        });
    }, [suppliers, filter]);

    function beginCreate() {
        setEditing({ ...emptyDraft });
    }

    function beginEdit(s: Supplier) {
        setEditing({ ...s });
    }

    async function handleSubmit() {
        if (!editing || !editing.name) return;
        try {
            setSaving(true);
            // @ts-ignore
            await upsertSupplier(editing);
            await refresh();
            setEditing(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(s: Supplier) {
        if (!confirm(`Excluir ${s.name}?`)) return;
        try {
            await deleteSupplier(s.id);
            await refresh();
        } catch (e: any) {
            setError(e.message);
        }
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-8">
                <SectionCard
                    title={`Fornecedores (${filtered.length})`}
                    action={
                        <div className="flex gap-2">
                            <input
                                className="btn-ghost text-xs"
                                placeholder="Buscar..."
                                value={filter}
                                onChange={e => setFilter(e.target.value)}
                            />
                            <button onClick={() => exportToCSV(filtered, 'fornecedores.csv')} className="btn-ghost text-xs p-1">
                                <Download size={16} />
                            </button>
                        </div>
                    }
                >
                    {loading ? (
                        <p>Carregando...</p>
                    ) : (
                        <SupplierTable items={filtered} onEdit={beginEdit} onDelete={handleDelete} />
                    )}
                </SectionCard>
            </div>
            <div className="lg:col-span-4">
                <SectionCard title={editing && editing.id ? 'Editar Fornecedor' : 'Novo Fornecedor'}>
                    {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
                    <SupplierForm
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

