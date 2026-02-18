import {
  LayoutDashboard,
  ClipboardCheck,
  Grid2x2,
  BarChart3,
  Settings
} from 'lucide-react';

export const PRIMARY_NAV_ITEMS = [
  { to: '/app/dashboard', label: 'Visao geral', mobileLabel: 'Visao', icon: LayoutDashboard, end: false },
  { to: '/app/operacoes', label: 'Operacoes', mobileLabel: 'Ops', icon: ClipboardCheck },
  { to: '/app/catalogo', label: 'Catalogo', mobileLabel: 'Catalogo', icon: Grid2x2 },
  { to: '/app/financeiro', label: 'Financeiro', mobileLabel: 'Financeiro', icon: BarChart3 },
  { to: '/app/config', label: 'Config', mobileLabel: 'Config', icon: Settings }
];
