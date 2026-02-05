import { TaskTabs, useTaskTabs } from '../ui/TaskTabs';
import SalesHistoryPage from './SalesHistoryPage';
import OperationsShipmentsPanel from './OperationsShipmentsPanel';
import OperationsPendingPanel from './OperationsPendingPanel';
import OperationsAlertsPanel from './OperationsAlertsPanel';
import QuestionsPage from './QuestionsPage';
import QuotesPage from './QuotesPage';
import NewSalePage from './NewSalePage';
import CompetitorTrackingPage from './CompetitorTrackingPage';
import MarketingPlanPage from './MarketingPlanPage';

const TABS = [
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'expedicao', label: 'Expedicao' },
  { id: 'pendencias', label: 'Pendencias' },
  { id: 'alertas', label: 'Alertas' },
  { id: 'perguntas', label: 'Perguntas' },
  { id: 'orcamentos', label: 'Orcamentos' },
  { id: 'nova-venda', label: 'Nova venda' },
  { id: 'competidores', label: 'Competidores' },
  { id: 'plano-mkt', label: 'Plano Mkt' }
];

export default function AppOperationsPage() {
  const { activeTab, setActiveTab } = useTaskTabs(TABS, 'pedidos');

  return (
    <div className="space-y-6">
      <TaskTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} ariaLabel="Operacoes" />

      {activeTab === 'pedidos' && <SalesHistoryPage />}
      {activeTab === 'expedicao' && <OperationsShipmentsPanel />}
      {activeTab === 'pendencias' && <OperationsPendingPanel />}
      {activeTab === 'alertas' && <OperationsAlertsPanel />}
      {activeTab === 'perguntas' && <QuestionsPage />}
      {activeTab === 'orcamentos' && <QuotesPage />}
      {activeTab === 'nova-venda' && <NewSalePage />}
      {activeTab === 'competidores' && <CompetitorTrackingPage />}
      {activeTab === 'plano-mkt' && <MarketingPlanPage />}
    </div>
  );
}
