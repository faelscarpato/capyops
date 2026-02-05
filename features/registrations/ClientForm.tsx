import { useState, useEffect } from 'react';
import { Client } from '../../lib/types';
import { upsertClient } from '../../lib/db';

type Props = {
    draft: Partial<Client>;
    onChange: (d: Partial<Client>) => void;
    onSubmit: () => void;
    onCancel: () => void;
    isSubmitting: boolean;
};

export default function ClientForm({ draft, onChange, onSubmit, onCancel, isSubmitting }: Props) {
    const [error, setError] = useState<string | null>(null);

    const isPF = draft.type === 'PF';

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                    <span className="text-sm font-medium">Tipo</span>
                    <select
                        value={draft.type}
                        onChange={(e) => onChange({ ...draft, type: e.target.value as 'PF' | 'PJ' })}
                        className="input w-full mt-1"
                    >
                        <option value="PF">Pessoa Física</option>
                        <option value="PJ">Pessoa Jurídica</option>
                    </select>
                </label>

                <label className="block">
                    <span className="text-sm font-medium">Nome {isPF ? 'Completo' : 'Fantasia'}</span>
                    <input
                        value={draft.name || ''}
                        onChange={(e) => onChange({ ...draft, name: e.target.value })}
                        className="input w-full mt-1"
                        placeholder={isPF ? 'João da Silva' : 'Empresa LTDA'}
                    />
                </label>

                <label className="block">
                    <span className="text-sm font-medium">{isPF ? 'CPF' : 'CNPJ'}</span>
                    <input
                        value={draft.document || ''}
                        onChange={(e) => onChange({ ...draft, document: e.target.value })}
                        className="input w-full mt-1"
                        placeholder="Apenas números"
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
                    <span className="text-sm font-medium">Telefone / WhatsApp</span>
                    <input
                        value={draft.phone || ''}
                        onChange={(e) => onChange({ ...draft, phone: e.target.value })}
                        className="input w-full mt-1"
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

                <label className="block">
                    <span className="text-sm font-medium">Cidade</span>
                    <input
                        value={draft.city || ''}
                        onChange={(e) => onChange({ ...draft, city: e.target.value })}
                        className="input w-full mt-1"
                    />
                </label>

                <label className="block">
                    <span className="text-sm font-medium">Estado (UF)</span>
                    <input
                        value={draft.state || ''}
                        onChange={(e) => onChange({ ...draft, state: e.target.value })}
                        className="input w-full mt-1"
                        maxLength={2}
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
