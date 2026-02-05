import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import AppLayout from './ui/AppLayout';
import LoginPage from './pages/LoginPage';
import IntegrationsMeliCallbackPage from './pages/IntegrationsMeliCallbackPage';
import OpeningSplash from './components/OpeningSplash';
import AppOverviewPage from './pages/AppOverviewPage';
import AppOperationsPage from './pages/AppOperationsPage';
import AppCatalogPage from './pages/AppCatalogPage';
import AppFinancePage from './pages/AppFinancePage';
import AppConfigPage from './pages/AppConfigPage';

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
          <Route index element={<Navigate to="/app" replace />} />
          <Route path="app" element={<AppOverviewPage />} />
          <Route path="app/operacoes" element={<AppOperationsPage />} />
          <Route path="app/catalogo" element={<AppCatalogPage />} />
          <Route path="app/financeiro" element={<AppFinancePage />} />
          <Route path="app/config" element={<AppConfigPage />} />

          <Route path="estoque" element={<Navigate to="/app/catalogo?tab=estoque" replace />} />
          <Route path="insumos" element={<Navigate to="/app/catalogo?tab=insumos" replace />} />
          <Route path="cadastros" element={<Navigate to="/app/catalogo?tab=produtos" replace />} />
          <Route path="despesas" element={<Navigate to="/app/financeiro?tab=custos" replace />} />
          <Route path="kits" element={<Navigate to="/app/catalogo?tab=kits" replace />} />
          <Route path="orcamentos" element={<Navigate to="/app/operacoes?tab=orcamentos" replace />} />
          <Route path="nova-venda" element={<Navigate to="/app/operacoes?tab=nova-venda" replace />} />

          <Route path="relatorios" element={<Navigate to="/app/financeiro?tab=relatorios" replace />} />
          <Route path="anuncios" element={<Navigate to="/app/catalogo?tab=anuncios" replace />} />
          <Route path="sales-history" element={<Navigate to="/app/operacoes?tab=pedidos" replace />} />
          <Route path="precificador" element={<Navigate to="/app/financeiro?tab=margem" replace />} />
          <Route path="perguntas" element={<Navigate to="/app/operacoes?tab=perguntas" replace />} />
          <Route path="competidores" element={<Navigate to="/app/operacoes?tab=competidores" replace />} />

          <Route path="configuracoes" element={<Navigate to="/app/config?tab=preferencias" replace />} />
          <Route path="plano-marketing" element={<Navigate to="/app/operacoes?tab=plano-mkt" replace />} />
          <Route path="integracoes/mercado-livre" element={<Navigate to="/app/config?tab=integracoes" replace />} />
          <Route path="integracoes/mercado-livre/callback" element={<IntegrationsMeliCallbackPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
