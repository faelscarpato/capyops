import { useState } from 'react';
import StockMovementManager from './stock/StockMovementManager';

export default function StockTab() {
    const [subTab, setSubTab] = useState<'entrada' | 'ajustes' | 'cancelamentos'>('entrada');

    return (
        <div className="space-y-6">
            <div className="flex border-b border-gray-200 dark:border-slate-700 table-scroll">
                <button onClick={() => setSubTab('entrada')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${subTab === 'entrada' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500'}`}>
                    Entrada / Saída
                </button>
                <button onClick={() => setSubTab('ajustes')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${subTab === 'ajustes' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500'}`}>
                    Balanço / Ajustes
                </button>
                <button onClick={() => setSubTab('cancelamentos')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${subTab === 'cancelamentos' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500'}`}>
                    Cancelamentos (Log)
                </button>
            </div>

            <div className="min-h-[400px] pt-4">
                {subTab === 'entrada' && <StockMovementManager />}
                {subTab === 'ajustes' && <StockMovementManager />}
                {/* Reusing Manager for now as it handles all types, but UI can be specific later */}
                {subTab === 'cancelamentos' && <div className="p-8 text-center text-gray-500">Histórico de Cancelamentos (Em breve)</div>}
            </div>
        </div>
    );
}

