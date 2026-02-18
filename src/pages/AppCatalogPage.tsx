import { TaskTabs, useTaskTabs } from '../ui/TaskTabs';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/primitives/Button';
import RegistrationsPage from './RegistrationsPage';
import InventoryPage from './InventoryPage';
import SuppliesPage from './SuppliesPage';
import PackingKitsPage from './PackingKitsPage';
import ListingsPage from './ListingsPage';
import PredictiveStockPage from './PredictiveStockPage';
import SectionHeader from '../app/v3/components/SectionHeader';

const TABS = [
  { id: 'produtos', label: 'Produtos' },
  { id: 'anuncios', label: 'Anuncios' },
  { id: 'kits', label: 'Kits' },
  { id: 'insumos', label: 'Insumos' },
  { id: 'estoque', label: 'Estoque' },
  { id: 'previsao', label: 'Previsao' }
];

export default function AppCatalogPage() {
  const navigate = useNavigate();
  const { activeTab, setActiveTab } = useTaskTabs(TABS, 'produtos', 'catalogTab');

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Catálogo"
        subtitle="Gestão de produtos, estoque e ativos de operação."
        actions={
          <Button type="button" variant="primary" onClick={() => navigate('/app/catalogo?catalogTab=produtos&regTab=produtos')}>
            Novo produto
          </Button>
        }
      />

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
