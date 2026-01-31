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

            <div className="border-b border-gray-200 dark:border-slate-800">
                <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
                ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600 dark:border-cyan-400 dark:text-cyan-400'
                                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-300'
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
