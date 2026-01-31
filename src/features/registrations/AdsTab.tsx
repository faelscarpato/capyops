import { useState } from 'react';
import AdsCategoryManager from './ads/AdsCategoryManager';

export default function AdsTab() {
    const [subTab, setSubTab] = useState<'categorias' | 'sku' | 'plataformas' | 'pagos' | 'organicos'>('categorias');

    return (
        <div className="space-y-6">
            <div className="flex border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
                <button onClick={() => setSubTab('categorias')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${subTab === 'categorias' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500'}`}>
                    Categorias
                </button>
                <button onClick={() => setSubTab('sku')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${subTab === 'sku' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500'}`}>
                    SKU
                </button>
                <button onClick={() => setSubTab('plataformas')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${subTab === 'plataformas' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500'}`}>
                    Plataformas
                </button>
                <button onClick={() => setSubTab('pagos')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${subTab === 'pagos' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500'}`}>
                    Tráfego Pago
                </button>
                <button onClick={() => setSubTab('organicos')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${subTab === 'organicos' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500'}`}>
                    Tráfego Orgânico
                </button>
            </div>

            <div className="min-h-[400px] pt-4">
                {subTab === 'categorias' && <AdsCategoryManager />}
                {subTab === 'sku' && <div className="p-8 text-center text-gray-500">Gestão de SKUs (Em breve)</div>}
                {subTab === 'plataformas' && <div className="p-8 text-center text-gray-500">Configuração de Plataformas (ML, Shopee)</div>}
                {subTab === 'pagos' && <div className="p-8 text-center text-gray-500">Gerenciador de Ads (Em breve)</div>}
                {subTab === 'organicos' && <div className="p-8 text-center text-gray-500">Listagem de Anúncios Orgânicos</div>}
            </div>
        </div>
    );
}
