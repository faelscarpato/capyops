import { useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
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

function RedirectWithSearch({
  to,
  mapSearch
}: {
  to: string;
  mapSearch?: (params: URLSearchParams) => URLSearchParams;
}) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const nextParams = mapSearch ? mapSearch(params) : params;
  const search = nextParams.toString();
  return <Navigate to={`${to}${search ? `?${search}` : ''}`} replace />;
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

          <Route
            path="estoque"
            element={
              <RedirectWithSearch
                to="/app/catalogo"
                mapSearch={(params) => {
                  const next = new URLSearchParams(params);
                  next.set('catalogTab', 'estoque');
                  return next;
                }}
              />
            }
          />
          <Route path="insumos" element={<Navigate to="/app/catalogo?catalogTab=insumos" replace />} />
          <Route
            path="cadastros"
            element={
              <RedirectWithSearch
                to="/app/catalogo"
                mapSearch={(params) => {
                  const next = new URLSearchParams(params);
                  const legacyTab = next.get('tab');
                  if (!next.get('regTab') && legacyTab) {
                    next.set('regTab', legacyTab === 'minierp' ? 'erp' : legacyTab);
                  }
                  next.delete('tab');
                  next.set('catalogTab', 'produtos');
                  return next;
                }}
              />
            }
          />
          <Route path="despesas" element={<Navigate to="/app/financeiro?tab=custos" replace />} />
          <Route path="kits" element={<Navigate to="/app/catalogo?catalogTab=kits" replace />} />
          <Route path="orcamentos" element={<Navigate to="/app/operacoes?tab=orcamentos" replace />} />
          <Route path="nova-venda" element={<Navigate to="/app/operacoes?tab=nova-venda" replace />} />

          <Route path="relatorios" element={<Navigate to="/app/financeiro?tab=relatorios" replace />} />
          <Route path="anuncios" element={<Navigate to="/app/catalogo?catalogTab=anuncios" replace />} />
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
