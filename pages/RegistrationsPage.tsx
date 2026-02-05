import { useSearchParams } from 'react-router-dom';
import PageHeader from '../ui/PageHeader';
import ProductTab from '../features/registrations/ProductTab';
import ClientTab from '../features/registrations/ClientTab';
import SupplierTab from '../features/registrations/SupplierTab';
import AdsTab from '../features/registrations/AdsTab';
import StockTab from '../features/registrations/StockTab';
import MiniERPTab from '../features/registrations/MiniERPTab';
import LogisticsTab from '../features/registrations/LogisticsTab';
import { TaskTabs, useTaskTabs } from '../ui/TaskTabs';


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
    const [searchParams] = useSearchParams();
    const { activeTab, setActiveTab } = useTaskTabs(TABS, 'produtos', 'regTab');
    const normalizedTab = activeTab === 'minierp' ? 'erp' : activeTab;

    const sub = searchParams.get('sub') ?? undefined;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Cadastros"
                subtitle="Central de gerenciamento de entidades do sistema."
            />

            <TaskTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} ariaLabel="Cadastros" />

            <div className="mt-4">
                {normalizedTab === 'produtos' && <ProductTab />}
                {normalizedTab === 'logistica' && <LogisticsTab initialSubTab={sub} />}
                {normalizedTab === 'clientes' && <ClientTab />}
                {normalizedTab === 'fornecedores' && <SupplierTab />}
                {normalizedTab === 'anuncios' && <AdsTab />}
                {normalizedTab === 'estoque' && <StockTab />}
                {normalizedTab === 'erp' && <MiniERPTab initialSubTab={sub} />}
            </div>
        </div>
    );
}
