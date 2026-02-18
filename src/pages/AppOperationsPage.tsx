import { TaskTabs, useTaskTabs } from '../ui/TaskTabs';
import { useSearchParams } from 'react-router-dom';
import { Button } from '../ui/primitives/Button';
import SalesHistoryPage from './SalesHistoryPage';
import OperationsShipmentsPanel from './OperationsShipmentsPanel';
import OperationsPendingPanel from './OperationsPendingPanel';
import OperationsAlertsPanel from './OperationsAlertsPanel';
import OperationsMessagesPanel from './OperationsMessagesPanel';
import OperationsFeedbackPanel from './OperationsFeedbackPanel';
import QuestionsPage from './QuestionsPage';
import QuotesPage from './QuotesPage';
import NewSalePage from './NewSalePage';
import CompetitorTrackingPage from './CompetitorTrackingPage';
import MarketingPlanPage from './MarketingPlanPage';
import SectionHeader from '../app/v3/components/SectionHeader';

const TABS = [
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'expedicao', label: 'Expedicao' },
  { id: 'pendencias', label: 'Pendencias' },
  { id: 'alertas', label: 'Alertas' },
  { id: 'mensagens', label: 'Mensagens' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'perguntas', label: 'Perguntas' },
  { id: 'orcamentos', label: 'Orcamentos' },
  { id: 'competidores', label: 'Competidores' },
  { id: 'plano-mkt', label: 'Plano Mkt' }
];

export default function AppOperationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeTab, setActiveTab } = useTaskTabs(TABS, 'pedidos');
  const showNewSale = searchParams.get('venda') === 'nova' || searchParams.get('tab') === 'nova-venda';

  function openNewSale() {
    const params = new URLSearchParams(searchParams);
    params.set('venda', 'nova');
    params.delete('tab');
    setSearchParams(params, { replace: true });
  }

  function closeNewSale() {
    const params = new URLSearchParams(searchParams);
    params.delete('venda');
    if (params.get('tab') === 'nova-venda') params.delete('tab');
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Operações"
        subtitle="Execução diária de pedidos, alertas, atendimento e expedição."
        actions={
          showNewSale ? (
            <Button type="button" variant="ghost" onClick={closeNewSale}>
              Voltar para visão operacional
            </Button>
          ) : (
            <Button type="button" variant="primary" onClick={openNewSale}>
              Nova venda
            </Button>
          )
        }
      />

      {!showNewSale ? (
        <TaskTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} ariaLabel="Operacoes" />
      ) : null}

      {showNewSale ? <NewSalePage /> : null}
      {!showNewSale && activeTab === 'pedidos' && <SalesHistoryPage />}
      {!showNewSale && activeTab === 'expedicao' && <OperationsShipmentsPanel />}
      {!showNewSale && activeTab === 'pendencias' && <OperationsPendingPanel />}
      {!showNewSale && activeTab === 'alertas' && <OperationsAlertsPanel />}
      {!showNewSale && activeTab === 'mensagens' && <OperationsMessagesPanel />}
      {!showNewSale && activeTab === 'feedback' && <OperationsFeedbackPanel />}
      {!showNewSale && activeTab === 'perguntas' && <QuestionsPage />}
      {!showNewSale && activeTab === 'orcamentos' && <QuotesPage />}
      {!showNewSale && activeTab === 'competidores' && <CompetitorTrackingPage />}
      {!showNewSale && activeTab === 'plano-mkt' && <MarketingPlanPage />}
    </div>
  );
}
