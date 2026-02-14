import { useState } from 'react';
import StockMovementManager from './stock/StockMovementManager';
import CancelLog from './stock/CancelLog';

export default function StockTab() {
    const [subTab, setSubTab] = useState<'entrada' | 'ajustes' | 'cancelamentos'>('entrada');

    return (
        <div className="space-y-6">
            <div className="table-scroll -mx-1 px-1">
                <div className="flex min-w-max items-center gap-2 border-b border-default pb-1">
                <button onClick={() => setSubTab('entrada')} className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${subTab === 'entrada' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}>
                    Entrada / Saída
                </button>
                <button onClick={() => setSubTab('ajustes')} className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${subTab === 'ajustes' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}>
                    Balanço / Ajustes
                </button>
                <button onClick={() => setSubTab('cancelamentos')} className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${subTab === 'cancelamentos' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}>
                    Cancelamentos (Log)
                </button>
                </div>
            </div>

            <div className="min-h-[400px] pt-4">
                {subTab === 'entrada' && <StockMovementManager />}
                {subTab === 'ajustes' && <StockMovementManager />}
                {/* Reusing Manager for now as it handles all types, but UI can be specific later */}
                {subTab === 'cancelamentos' && <CancelLog />}
            </div>
        </div>
    );
}

