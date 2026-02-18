import { TaskTabs, useTaskTabs } from '../ui/TaskTabs';
import IntegrationsMeliPage from './IntegrationsMeliPage';
import SettingsPage from './SettingsPage';
import SectionHeader from '../app/v3/components/SectionHeader';

const TABS = [
  { id: 'integracoes', label: 'Integracoes' },
  { id: 'time', label: 'Time' },
  { id: 'preferencias', label: 'Preferencias' }
];

export default function AppConfigPage() {
  const { activeTab, setActiveTab } = useTaskTabs(TABS, 'integracoes');

  return (
    <div className="space-y-4">
      <SectionHeader title="Configurações" subtitle="Integrações, time e preferências da conta." />
      <TaskTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} ariaLabel="Config" />

      {activeTab === 'integracoes' && <IntegrationsMeliPage />}
      {(activeTab === 'time' || activeTab === 'preferencias') && <SettingsPage />}
    </div>
  );
}
