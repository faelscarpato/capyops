import { useState } from 'react';
import PageHeader from '../ui/PageHeader';
import SectionCard from '../ui/SectionCard';
import ProductTab from '../features/registrations/ProductTab';
import ClientTab from '../features/registrations/ClientTab';
import SupplierTab from '../features/registrations/SupplierTab';
import AdsTab from '../features/registrations/AdsTab';
import StockTab from '../features/registrations/StockTab';
import MiniERPTab from '../features/registrations/MiniERPTab';
import LogisticsTab from '../features/registrations/LogisticsTab';


// Tabs
const TABS = [
    { id: 'produtos', label: 'Produtos' },
    { id: 'logistica', label: 'Logística' },
    { id: 'clientes', label: 'Clientes' },
    { id: 'fornecedores', label: 'Fornecedores' },
    { id: 'anuncios', label: 'Anúncios' },
    { id: 'estoque', label: 'Estoque' },
    { id: 'erp', label: 'Mini-ERP' }
] as const;

type TabId = typeof TABS[number]['id'];

export default function RegistrationsPage() {
    const [activeTab, setActiveTab] = useState<TabId>('produtos');

    return (
        <div className="space-y-6">
            <PageHeader
                title="Cadastros"
                subtitle="Central de gerenciamento de entidades do sistema."
            />

            <div className="card p-2">
                <nav className="flex flex-wrap gap-2" aria-label="Tabs">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors
                ${activeTab === tab.id
                                    ? 'bg-indigo-50 text-indigo-700 dark:bg-cyan-400/15 dark:text-cyan-200'
                                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200'
                                }
              `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-4">
                {activeTab === 'produtos' && <ProductTab />}
                {activeTab === 'logistica' && <LogisticsTab />}
                {activeTab === 'clientes' && <ClientTab />}
                {activeTab === 'fornecedores' && <SupplierTab />}
                {activeTab === 'anuncios' && <AdsTab />}
                {activeTab === 'estoque' && <StockTab />}
                {activeTab === 'erp' && <MiniERPTab />}
            </div>
        </div>
    );
}

function PlaceholderTab({ name }: { name: string }) {
    return (
        <SectionCard title={name}>
            <p className="text-gray-500 dark:text-slate-400">Conteúdo da aba {name} em desenvolvimento...</p>
        </SectionCard>
    );
}
