import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import AppLayout from './ui/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import NewSalePage from './pages/NewSalePage';
import ReportsPage from './pages/ReportsPage';
import MarketingPlanPage from './pages/MarketingPlanPage';
import PriceCalculatorPage from './pages/PriceCalculatorPage';
import SuppliesPage from './pages/SuppliesPage';
import ExpensesPage from './pages/ExpensesPage';
import PackingKitsPage from './pages/PackingKitsPage';
import QuotesPage from './pages/QuotesPage';
import OpeningSplash from './components/OpeningSplash';

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">Carregando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AuthProvider>
      {showSplash ? <OpeningSplash onComplete={() => setShowSplash(false)} /> : null}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="estoque" element={<InventoryPage />} />
          <Route path="insumos" element={<SuppliesPage />} />
          <Route path="despesas" element={<ExpensesPage />} />
          <Route path="kits" element={<PackingKitsPage />} />
          <Route path="orcamentos" element={<QuotesPage />} />
          <Route path="nova-venda" element={<NewSalePage />} />
          <Route path="relatorios" element={<ReportsPage />} />
          <Route path="precificador" element={<PriceCalculatorPage />} />
          <Route path="plano-marketing" element={<MarketingPlanPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
