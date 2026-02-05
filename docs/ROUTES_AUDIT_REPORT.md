# Routes Audit Report — CapyOps ML

## Resumo
- Stack: React 18 + Vite + TS + Tailwind, react-router-dom v6.
- Rotas declaradas centralizadas em `src/App.tsx` com guard `Protected` para área interna.
- Navegação principal via sidebar em `src/ui/AppLayout.tsx` + ações por `useNavigate`/`window.location`.

## Rotas Reconhecidas ✅
### Públicas
- `/login`
  - Evidência: `src/App.tsx` `<Route path="/login" element={<LoginPage />} />`

### Protegidas (guard `Protected`)
- `/` (index)
- `/estoque`
- `/insumos`
- `/cadastros`
- `/despesas`
- `/kits`
- `/orcamentos`
- `/nova-venda`
- `/relatorios`
- `/anuncios`
- `/sales-history`
- `/precificador`
- `/perguntas`
- `/competidores`
- `/configuracoes`
- `/plano-marketing`
- `/integracoes/mercado-livre`
- `/integracoes/mercado-livre/callback`

Evidência geral: `src/App.tsx` bloco `<Routes>`.

### Fallback
- `* → /`
  - Evidência: `src/App.tsx` `<Route path="*" element={<Navigate to="/" replace />} />`

## Navegação (UI → Ação → Destino)
- Sidebar (AppLayout)
  - `/` Dashboard
  - `/anuncios`
  - `/integracoes/mercado-livre`
  - `/configuracoes`
  - `/estoque`
  - `/cadastros`
  - `/insumos`
  - `/despesas`
  - `/kits`
  - `/orcamentos`
  - `/sales-history`
  - `/precificador`
  - `/relatorios`
  - `/plano-marketing`
  - Evidência: `src/ui/AppLayout.tsx` `navItems`.

- Programática / botões
  - Dashboard KPIs → `/relatorios`, `/nova-venda`, `/estoque?f=critical`, `/configuracoes`
    - `src/pages/DashboardPage.tsx`
  - Marketing Plan cards → `/perguntas`, `/competidores`, `/anuncios`
    - `src/pages/MarketingPlanPage.tsx`
  - Alerts popover → `/perguntas`, `/competidores`, `/plano-marketing`, `/integracoes/mercado-livre`
    - `src/ui/AlertsPopover.tsx`
  - Ações com `window.location.href` (Cadastros deep links)
    - `src/pages/InventoryPage.tsx` `/cadastros?tab=estoque`
    - `src/pages/PackingKitsPage.tsx` `/cadastros?tab=logistica&sub=kits`
    - `src/pages/QuotesPage.tsx` `/cadastros?tab=minierp&sub=cotacoes`
    - `src/pages/ListingsPage.tsx`, `src/pages/SuppliesPage.tsx`, `src/pages/ExpensesPage.tsx`

## Rotas Ambíguas ⚠️
- `src/components/Shell.tsx` contém navegação alternativa, mas não é montado em nenhuma rota conhecida.

## Rotas Quebradas ❌
- Nenhuma encontrada (todas as rotas citadas pela UI existem em `App.tsx`).

## Rotas Órfãs 🧩
- `/integracoes/mercado-livre/callback` não é acessível via UI, mas é endpoint de retorno OAuth (acesso externo esperado).

## Dead-end 🕳️
- Nenhuma página placeholder detectada nas rotas principais.

## Fluxos a Implementar 🚧
- Nenhum fluxo sem handler real detectado nas rotas principais.

## Apêndice de Evidências
- `src/App.tsx`: definição de todas as rotas e guard `Protected`.
- `src/ui/AppLayout.tsx`: `navItems` e `useNavigate` para logout.
- `src/pages/DashboardPage.tsx`: `navigate('/relatorios'|'/nova-venda'|'/estoque?f=critical'|'/configuracoes')`.
- `src/ui/AlertsPopover.tsx`: `navigate('/perguntas'|'/competidores'|'/plano-marketing'|'/integracoes/mercado-livre')`.
- `src/pages/InventoryPage.tsx`, `src/pages/PackingKitsPage.tsx`, `src/pages/QuotesPage.tsx`: `window.location.href` para rotas de cadastros.
