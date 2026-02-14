import { useState } from 'react';
import AdsCategoryManager from './ads/AdsCategoryManager';
import AdsSkuManager from './ads/AdsSkuManager';
import AdsPlatformsManager from './ads/AdsPlatformsManager';
import AdsPaidManager from './ads/AdsPaidManager';
import AdsOrganicManager from './ads/AdsOrganicManager';

export default function AdsTab() {
    const [subTab, setSubTab] = useState<'categorias' | 'sku' | 'plataformas' | 'pagos' | 'organicos'>('categorias');

    return (
        <div className="space-y-6">
            <div className="table-scroll -mx-1 px-1">
                <div className="flex min-w-max items-center gap-2 border-b border-default pb-1">
                <button onClick={() => setSubTab('categorias')} className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${subTab === 'categorias' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}>
                    Categorias
                </button>
                <button onClick={() => setSubTab('sku')} className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${subTab === 'sku' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}>
                    SKU
                </button>
                <button onClick={() => setSubTab('plataformas')} className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${subTab === 'plataformas' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}>
                    Plataformas
                </button>
                <button onClick={() => setSubTab('pagos')} className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${subTab === 'pagos' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}>
                    Tráfego Pago
                </button>
                <button onClick={() => setSubTab('organicos')} className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${subTab === 'organicos' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}>
                    Tráfego Orgânico
                </button>
                </div>
            </div>

            <div className="min-h-[400px] pt-4">
                {subTab === 'categorias' && <AdsCategoryManager />}
                {subTab === 'sku' && <AdsSkuManager />}
                {subTab === 'plataformas' && <AdsPlatformsManager />}
                {subTab === 'pagos' && <AdsPaidManager />}
                {subTab === 'organicos' && <AdsOrganicManager />}
            </div>
        </div>
    );
}

