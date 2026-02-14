import { useEffect, useState } from 'react';
import SupplyManager from './logistics/SupplyManager';
import PackingKitManager from './logistics/PackingKitManager';
import ProductWeightManager from './logistics/ProductWeightManager';
import PackagingManager from './logistics/PackagingManager';
import ShippingRatesManager from './logistics/ShippingRatesManager';

type SubTab = 'insumos' | 'kits' | 'pesos' | 'embalagens' | 'taxas';

export default function LogisticsTab({ initialSubTab }: { initialSubTab?: string }) {
    const [subTab, setSubTab] = useState<SubTab>('insumos');

    useEffect(() => {
        if (!initialSubTab) return;
        const allowed: SubTab[] = ['insumos', 'kits', 'pesos', 'embalagens', 'taxas'];
        if (allowed.includes(initialSubTab as SubTab)) setSubTab(initialSubTab as SubTab);
    }, [initialSubTab]);

    return (
        <div className="space-y-6">
            <div className="table-scroll -mx-1 px-1">
                <div className="flex min-w-max items-center gap-2 border-b border-default pb-1">
                <button
                    onClick={() => setSubTab('insumos')}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition whitespace-nowrap ${subTab === 'insumos' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}
                >
                    Insumos
                </button>
                <button
                    onClick={() => setSubTab('kits')}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition whitespace-nowrap ${subTab === 'kits' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}
                >
                    Kits de Embalagem
                </button>
                <button
                    onClick={() => setSubTab('pesos')}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition whitespace-nowrap ${subTab === 'pesos' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}
                >
                    Pesos de Produtos
                </button>
                <button
                    onClick={() => setSubTab('embalagens')}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition whitespace-nowrap ${subTab === 'embalagens' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}
                >
                    Embalagens
                </button>
                <button
                    onClick={() => setSubTab('taxas')}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition whitespace-nowrap ${subTab === 'taxas' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}
                >
                    Taxas e Prazos
                </button>
                </div>
            </div>

            <div className="min-h-[400px]">
                {subTab === 'insumos' && <SupplyManager />}
                {subTab === 'kits' && <PackingKitManager />}
                {subTab === 'pesos' && <ProductWeightManager />}
                {subTab === 'embalagens' && <PackagingManager />}
                {subTab === 'taxas' && <ShippingRatesManager />}
            </div>
        </div>
    );
}

