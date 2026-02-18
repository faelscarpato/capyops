import { TaskTabs, useTaskTabs } from '../ui/TaskTabs';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/primitives/Button';
import ExpensesPage from './ExpensesPage';
import PriceCalculatorPage from './PriceCalculatorPage';
import ReportsPage from './ReportsPage';
import SectionHeader from '../app/v3/components/SectionHeader';
import FinanceOverviewPage from './FinanceOverviewPage';

const TABS = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'custos', label: 'Custos' },
  { id: 'margem', label: 'Margem' },
  { id: 'relatorios', label: 'Relatorios' }
];

export default function AppFinancePage() {
  const navigate = useNavigate();
  const { activeTab, setActiveTab } = useTaskTabs(TABS, 'resumo');

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Financeiro"
        subtitle="Acompanhe margem, despesas e relatórios em tempo real."
        actions={
          <Button type="button" variant="primary" onClick={() => navigate('/app/financeiro?tab=relatorios')}>
            Ir para relatórios
          </Button>
        }
      />

      <TaskTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} ariaLabel="Financeiro" />

      {activeTab === 'resumo' && <FinanceOverviewPage />}
      {activeTab === 'custos' && <ExpensesPage />}
      {activeTab === 'margem' && <PriceCalculatorPage />}
      {activeTab === 'relatorios' && <ReportsPage />}
    </div>
  );
}
