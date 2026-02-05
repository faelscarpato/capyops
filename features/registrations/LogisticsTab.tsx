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
            <div className="flex border-b border-gray-200 dark:border-slate-700 table-scroll">
                <button
                    onClick={() => setSubTab('insumos')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${subTab === 'insumos' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Insumos
                </button>
                <button
                    onClick={() => setSubTab('kits')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${subTab === 'kits' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Kits de Embalagem
                </button>
                <button
                    onClick={() => setSubTab('pesos')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${subTab === 'pesos' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Pesos de Produtos
                </button>
                <button
                    onClick={() => setSubTab('embalagens')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${subTab === 'embalagens' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Embalagens
                </button>
                <button
                    onClick={() => setSubTab('taxas')}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${subTab === 'taxas' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Taxas e Prazos
                </button>
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

