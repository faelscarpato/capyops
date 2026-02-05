import {
  LayoutDashboard,
  ClipboardCheck,
  Grid2x2,
  BarChart3,
  Settings
} from 'lucide-react';

export const PRIMARY_NAV_ITEMS = [
  { to: '/app', label: 'Visao geral', icon: LayoutDashboard, end: true },
  { to: '/app/operacoes', label: 'Operacoes', icon: ClipboardCheck },
  { to: '/app/catalogo', label: 'Catalogo', icon: Grid2x2 },
  { to: '/app/financeiro', label: 'Financeiro', icon: BarChart3 },
  { to: '/app/config', label: 'Config', icon: Settings }
];
