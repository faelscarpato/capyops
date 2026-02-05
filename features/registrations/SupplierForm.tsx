import { useState } from 'react';
import { Supplier } from '../../lib/types';

type Props = {
    draft: Partial<Supplier>;
    onChange: (d: Partial<Supplier>) => void;
    onSubmit: () => void;
    onCancel: () => void;
    isSubmitting: boolean;
};

export default function SupplierForm({ draft, onChange, onSubmit, onCancel, isSubmitting }: Props) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                    <span className="text-sm font-medium">Nome da Empresa</span>
                    <input
                        value={draft.name || ''}
                        onChange={(e) => onChange({ ...draft, name: e.target.value })}
                        className="input w-full mt-1"
                        placeholder="Ex.: Fornecedor XYZ"
                    />
                </label>

                <label className="block">
                    <span className="text-sm font-medium">Nome Contato</span>
                    <input
                        value={draft.contact_name || ''}
                        onChange={(e) => onChange({ ...draft, contact_name: e.target.value })}
                        className="input w-full mt-1"
                        placeholder="Ex.: Maria"
                    />
                </label>

                <label className="block">
                    <span className="text-sm font-medium">CNPJ / Doc</span>
                    <input
                        value={draft.doc_cnpj || ''}
                        onChange={(e) => onChange({ ...draft, doc_cnpj: e.target.value })}
                        className="input w-full mt-1"
                    />
                </label>

                <label className="block">
                    <span className="text-sm font-medium">Email</span>
                    <input
                        value={draft.email || ''}
                        onChange={(e) => onChange({ ...draft, email: e.target.value })}
                        className="input w-full mt-1"
                        type="email"
                    />
                </label>

                <label className="block">
                    <span className="text-sm font-medium">Telefone</span>
                    <input
                        value={draft.phone || ''}
                        onChange={(e) => onChange({ ...draft, phone: e.target.value })}
                        className="input w-full mt-1"
                    />
                </label>

                <label className="block">
                    <span className="text-sm font-medium">Lead Time (dias)</span>
                    <input
                        value={draft.lead_time_days || ''}
                        onChange={(e) => onChange({ ...draft, lead_time_days: Number(e.target.value) || 0 })}
                        className="input w-full mt-1"
                        type="number"
                    />
                </label>

                <label className="block md:col-span-2">
                    <span className="text-sm font-medium">Website</span>
                    <input
                        value={draft.website || ''}
                        onChange={(e) => onChange({ ...draft, website: e.target.value })}
                        className="input w-full mt-1"
                        placeholder="https://..."
                    />
                </label>

                <label className="block md:col-span-2">
                    <span className="text-sm font-medium">Endereço</span>
                    <input
                        value={draft.address || ''}
                        onChange={(e) => onChange({ ...draft, address: e.target.value })}
                        className="input w-full mt-1"
                    />
                </label>

                <label className="block md:col-span-2">
                    <span className="text-sm font-medium">Observações</span>
                    <textarea
                        value={draft.notes || ''}
                        onChange={(e) => onChange({ ...draft, notes: e.target.value })}
                        className="input w-full mt-1"
                        rows={3}
                    />
                </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <button className="btn-ghost" onClick={onCancel} disabled={isSubmitting}>
                    Cancelar
                </button>
                <button className="btn-primary" onClick={onSubmit} disabled={isSubmitting || !draft.name}>
                    Salvar
                </button>
            </div>
        </div>
    );
}
