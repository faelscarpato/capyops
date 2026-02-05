import { TaskTabs, useTaskTabs } from '../ui/TaskTabs';
import RegistrationsPage from './RegistrationsPage';
import InventoryPage from './InventoryPage';
import SuppliesPage from './SuppliesPage';
import PackingKitsPage from './PackingKitsPage';
import ListingsPage from './ListingsPage';
import PredictiveStockPage from './PredictiveStockPage';

const TABS = [
  { id: 'produtos', label: 'Produtos' },
  { id: 'anuncios', label: 'Anuncios' },
  { id: 'kits', label: 'Kits' },
  { id: 'insumos', label: 'Insumos' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'previsao', label: 'Previsao' }
];

export default function AppCatalogPage() {
  const { activeTab, setActiveTab } = useTaskTabs(TABS, 'produtos', 'catalogTab');

  return (
    <div className="space-y-6">
      <TaskTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} ariaLabel="Catalogo" />

      {activeTab === 'produtos' && <RegistrationsPage />}
      {activeTab === 'anuncios' && <ListingsPage />}
      {activeTab === 'kits' && <PackingKitsPage />}
      {activeTab === 'insumos' && <SuppliesPage />}
      {activeTab === 'estoque' && <InventoryPage />}
      {activeTab === 'previsao' && <PredictiveStockPage />}
    </div>
  );
}
