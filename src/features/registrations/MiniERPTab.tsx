import { useEffect, useState } from 'react';
import ExpenseManager from './minierp/ExpenseManager';
import NewSaleWizard from '../../components/sales/NewSaleWizard';
import PaymentManager from './minierp/PaymentManager';
import PurchaseQuoteManager from './minierp/PurchaseQuoteManager';
import ReturnsManager from './minierp/ReturnsManager';
import FeesManager from './minierp/FeesManager';
import TaxesManager from './minierp/TaxesManager';

type SubTab = 'venda' | 'despesas' | 'cotacoes' | 'pagamentos' | 'devolucao' | 'taxas' | 'impostos';

export default function MiniERPTab({ initialSubTab }: { initialSubTab?: string }) {
    const [subTab, setSubTab] = useState<SubTab>('despesas');

    useEffect(() => {
        if (!initialSubTab) return;
        const allowed: SubTab[] = ['venda', 'despesas', 'cotacoes', 'pagamentos', 'devolucao', 'taxas', 'impostos'];
        if (allowed.includes(initialSubTab as SubTab)) setSubTab(initialSubTab as SubTab);
    }, [initialSubTab]);

    return (
        <div className="space-y-6">
            <div className="table-scroll -mx-1 px-1">
                <div className="flex min-w-max items-center gap-2 border-b border-default pb-1">
                <button onClick={() => setSubTab('venda')} className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${subTab === 'venda' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}>
                    Nova Venda
                </button>
                <button onClick={() => setSubTab('despesas')} className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${subTab === 'despesas' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}>
                    Despesas
                </button>
                <button onClick={() => setSubTab('cotacoes')} className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${subTab === 'cotacoes' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}>
                    Cotações e Orçamentos
                </button>
                <button onClick={() => setSubTab('pagamentos')} className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${subTab === 'pagamentos' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}>
                    Pagamentos
                </button>
                <button onClick={() => setSubTab('devolucao')} className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${subTab === 'devolucao' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}>
                    Devolução
                </button>
                <button onClick={() => setSubTab('taxas')} className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${subTab === 'taxas' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}>
                    Taxas
                </button>
                <button onClick={() => setSubTab('impostos')} className={`rounded-md border px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${subTab === 'impostos' ? 'border-[color:var(--primary)] bg-surface-2 text-[color:var(--primary)]' : 'border-transparent text-muted hover:border-default hover:bg-surface-2 hover:text-fg'}`}>
                    Impostos
                </button>
                </div>
            </div>

            <div className="min-h-[400px]">
                {subTab === 'despesas' && <ExpenseManager />}
                {subTab === 'venda' && <div className="rounded-lg border border-default bg-surface-2 p-4"><NewSaleWizard /></div>}
                {subTab === 'cotacoes' && <PurchaseQuoteManager />}
                {subTab === 'pagamentos' && <PaymentManager />}
                {subTab === 'devolucao' && <ReturnsManager />}
                {subTab === 'taxas' && <FeesManager />}
                {subTab === 'impostos' && <TaxesManager />}
            </div>
        </div>
    );
}

