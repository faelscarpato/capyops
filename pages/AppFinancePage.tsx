import { TaskTabs, useTaskTabs } from '../ui/TaskTabs';
import DashboardPage from './DashboardPage';
import ExpensesPage from './ExpensesPage';
import PriceCalculatorPage from './PriceCalculatorPage';
import ReportsPage from './ReportsPage';

const TABS = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'custos', label: 'Custos' },
  { id: 'margem', label: 'Margem' },
  { id: 'relatorios', label: 'Relatorios' }
];

export default function AppFinancePage() {
  const { activeTab, setActiveTab } = useTaskTabs(TABS, 'resumo');

  return (
    <div className="space-y-6">
      <TaskTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} ariaLabel="Financeiro" />

      {activeTab === 'resumo' && <DashboardPage />}
      {activeTab === 'custos' && <ExpensesPage />}
      {activeTab === 'margem' && <PriceCalculatorPage />}
      {activeTab === 'relatorios' && <ReportsPage />}
    </div>
  );
}
