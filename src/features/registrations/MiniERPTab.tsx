import { useState } from 'react';
import ExpenseManager from './minierp/ExpenseManager';
import NewSaleWizard from '../../components/sales/NewSaleWizard';
import PaymentManager from './minierp/PaymentManager';
import PurchaseQuoteManager from './minierp/PurchaseQuoteManager';

export default function MiniERPTab() {
    const [subTab, setSubTab] = useState<'venda' | 'despesas' | 'cotacoes' | 'pagamentos' | 'devolucao' | 'taxas' | 'impostos'>('despesas');

    return (
        <div className="space-y-6">
            <div className="flex border-b border-gray-200 dark:border-slate-700 table-scroll">
                <button onClick={() => setSubTab('venda')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${subTab === 'venda' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500'}`}>
                    Nova Venda
                </button>
                <button onClick={() => setSubTab('despesas')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${subTab === 'despesas' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500'}`}>
                    Despesas
                </button>
                <button onClick={() => setSubTab('cotacoes')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${subTab === 'cotacoes' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500'}`}>
                    Cotações e Orçamentos
                </button>
                <button onClick={() => setSubTab('pagamentos')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${subTab === 'pagamentos' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500'}`}>
                    Pagamentos
                </button>
                <button onClick={() => setSubTab('devolucao')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${subTab === 'devolucao' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500'}`}>
                    Devolução
                </button>
                <button onClick={() => setSubTab('taxas')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${subTab === 'taxas' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500'}`}>
                    Taxas
                </button>
                <button onClick={() => setSubTab('impostos')} className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${subTab === 'impostos' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500'}`}>
                    Impostos
                </button>
            </div>

            <div className="min-h-[400px]">
                {subTab === 'despesas' && <ExpenseManager />}
                {subTab === 'venda' && <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg"><NewSaleWizard /></div>}
                {subTab === 'cotacoes' && <PurchaseQuoteManager />}
                {subTab === 'pagamentos' && <PaymentManager />}

                {subTab !== 'despesas' && subTab !== 'venda' && subTab !== 'cotacoes' && subTab !== 'pagamentos' && <div className="p-8 text-center text-gray-500">Módulo em desenvolvimento...</div>}
            </div>
        </div>
    );
}

