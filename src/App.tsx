import { useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import LoginPage from './pages/LoginPage';
import IntegrationsMeliCallbackPage from './pages/IntegrationsMeliCallbackPage';
import OpeningSplash from './components/OpeningSplash';
import AppOverviewPage from './pages/AppOverviewPage';
import AppOperationsPage from './pages/AppOperationsPage';
import AppCatalogPage from './pages/AppCatalogPage';
import AppFinancePage from './pages/AppFinancePage';
import AppConfigPage from './pages/AppConfigPage';
import AppShellV3 from './app/v3/shell/AppShellV3';

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-[color:var(--muted)]">Carregando...</div>;
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
          path="/dashboard"
          element={
            <Protected>
              <Navigate to="/app/dashboard" replace />
            </Protected>
          }
        />
        <Route
          path="/app"
          element={
            <Protected>
              <AppShellV3 />
            </Protected>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AppOverviewPage />} />
          <Route path="operacoes" element={<AppOperationsPage />} />
          <Route path="catalogo" element={<AppCatalogPage />} />
          <Route path="financeiro" element={<AppFinancePage />} />
          <Route path="config" element={<AppConfigPage />} />
        </Route>
        <Route path="/v3/*" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/" element={<Protected><Navigate to="/app/dashboard" replace /></Protected>} />
        <Route
          path="/estoque"
          element={
            <Protected>
              <RedirectWithSearch
                to="/app/catalogo"
                mapSearch={(params) => {
                  const next = new URLSearchParams(params);
                  next.set('catalogTab', 'estoque');
                  return next;
                }}
              />
            </Protected>
          }
        />
        <Route path="/insumos" element={<Protected><Navigate to="/app/catalogo?catalogTab=insumos" replace /></Protected>} />
        <Route
          path="/cadastros"
          element={
            <Protected>
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
            </Protected>
          }
        />
        <Route path="/despesas" element={<Protected><Navigate to="/app/financeiro?tab=custos" replace /></Protected>} />
        <Route path="/kits" element={<Protected><Navigate to="/app/catalogo?catalogTab=kits" replace /></Protected>} />
        <Route path="/orcamentos" element={<Protected><Navigate to="/app/operacoes?tab=orcamentos" replace /></Protected>} />
        <Route path="/nova-venda" element={<Protected><Navigate to="/app/operacoes?venda=nova" replace /></Protected>} />
        <Route path="/relatorios" element={<Protected><Navigate to="/app/financeiro?tab=relatorios" replace /></Protected>} />
        <Route path="/anuncios" element={<Protected><Navigate to="/app/catalogo?catalogTab=anuncios" replace /></Protected>} />
        <Route path="/sales-history" element={<Protected><Navigate to="/app/operacoes?tab=pedidos" replace /></Protected>} />
        <Route path="/precificador" element={<Protected><Navigate to="/app/financeiro?tab=margem" replace /></Protected>} />
        <Route path="/perguntas" element={<Protected><Navigate to="/app/operacoes?tab=perguntas" replace /></Protected>} />
        <Route path="/competidores" element={<Protected><Navigate to="/app/operacoes?tab=competidores" replace /></Protected>} />
        <Route path="/configuracoes" element={<Protected><Navigate to="/app/config?tab=preferencias" replace /></Protected>} />
        <Route path="/plano-marketing" element={<Protected><Navigate to="/app/operacoes?tab=plano-mkt" replace /></Protected>} />
        <Route path="/integracoes/mercado-livre" element={<Protected><Navigate to="/app/config?tab=integracoes" replace /></Protected>} />
        <Route
          path="/integracoes/mercado-livre/callback"
          element={
            <Protected>
              <IntegrationsMeliCallbackPage />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
