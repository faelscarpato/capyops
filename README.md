# CapyOps ML (privado) — Operação diária + Estoque + Vendas + Precificador (CBS/IBS)

CapyOps ML é um **painel interno (privado)** para operar uma loja no Mercado Livre no modo **Normal-first**, com foco em execução diária sem falhas: **tarefas do dia, estoque crítico, registro de vendas, lucro estimado e precificação com impostos (CBS/IBS/IS) + taxa ML + margem**.

O sistema roda em **React + Vite + TypeScript** e usa **Supabase** (Auth + Postgres + RLS + RPCs) para persistência e automações.

---

## O que está pronto hoje (MVP)

### 1) Login

* Tela dedicada em `/login`
* Autenticação via Supabase (`src/lib/auth.tsx`)

### 2) Dashboard (Tela principal de operação)

Rota: `/`

**Funcionalidades**

* Gera/garante tarefas do dia via RPC (**`ensure_daily_tasks`**) e lista tarefas do dia (`daily_tasks`)
* Marca tarefas como concluídas (update em `daily_tasks`)
* Resumo de vendas: **Hoje** e **Últimos 30 dias** (estimado)
* Alertas de estoque crítico (quando `stock <= min_stock`)
* Widget lateral com:

  * resumo do dia (tarefas)
  * estoque crítico
  * vendas do dia
  * impostos estimados do dia por venda
  * ajuste rápido de alíquotas (CBS/IBS/IS)

Arquivo: `src/pages/DashboardPage.tsx`

### 3) Estoque (Cadastro e controle)

Rota: `/estoque`

**Funcionalidades**

* Lista produtos ativos
* Cria/edita produto (upsert/update)
* Campos principais: `name`, `variant`, `size_cm`, `material`, `cost`, `price`, `stock`, `min_stock`, `notes`, `is_active`

Arquivo: `src/pages/InventoryPage.tsx`
DB: `src/lib/db.ts` (funções `listProducts`, `upsertProduct`, `updateProduct`)

### 4) Nova Venda

Rota: `/nova-venda`

**Funcionalidades**

* Registra venda via RPC **`apply_sale`**
* Baixa estoque como parte da transação (responsabilidade do RPC no banco)
* Mantém parâmetros de custo/fee por venda (frete, taxa ML, embalagem, extra)

Arquivo: `src/pages/NewSalePage.tsx`
DB: `src/lib/db.ts` (`applySale`)

### 5) Precificador (novo modelo com CBS/IBS/IS)

Rota: `/precificador`

**Funcionalidades**

* Calcula preço final sugerido com:

  * custo do produto
  * embalagem
  * frete
  * taxa ML
  * CBS, IBS e IS (opcional)
  * margem desejada
* Persistência local das taxas/margem em `localStorage` (por perfil do navegador)

Arquivo: `src/pages/PriceCalculatorPage.tsx`
Taxas: `src/lib/taxRates.ts` (DEFAULT + read/write)

### 6) Plano Mkt + Operação (Documento vivo dentro do app)

Rota: `/plano-marketing`
Arquivo: `src/pages/MarketingPlanPage.tsx`

### 7) Relatórios (base pronta)

Rota: `/relatorios`
Arquivo: `src/pages/ReportsPage.tsx`
DB: `src/lib/db.ts` (`listSalesInRange`, `getSalesSummaryLastNDays`)

---

## UI / Componentes e Padrões de Layout

### Layout e Navegação

* Sidebar + Header + área principal com rotas protegidas
* Toggle de tema (claro/escuro) via `ThemeModeProvider` (classe `dark` no HTML)

Arquivos:

* `src/ui/AppLayout.tsx` (layout principal e menu)
* `src/ui/ThemeModeProvider.tsx` (modo claro/escuro)
* `src/App.tsx` (rotas + proteção + splash)

### Componentes UI do projeto

* `PageHeader` — título, subtítulo e ações do topo (`src/ui/PageHeader.tsx`)
* `SectionCard` — cartões com header + conteúdo (`src/ui/SectionCard.tsx`)
* `MetricCard` — cards de métricas do dashboard (`src/ui/MetricCard.tsx`)
* `StatusChip` — chips/estados (quando usados) (`src/ui/StatusChip.tsx`)
* Sidebar widget context — injeta widgets na sidebar (`src/ui/SidebarWidgetContext.tsx`)

### Splash inicial

Existe uma tela de abertura animada (ícones + progress) antes de carregar o app:

* `src/components/OpeningSplash.tsx`

Observação: atualmente o splash usa fundo escuro. Se a diretriz for **100% claro**, este é um ponto de ajuste.

---

## Estrutura de pastas (alto nível)

```
src/
  App.tsx
  components/
    OpeningSplash.tsx
    Shell.tsx              (layout antigo/alternativo)
  lib/
    auth.tsx               (Supabase auth + contexto)
    db.ts                  (queries + RPCs)
    supabase.ts            (client)
    taxRates.ts            (taxas do precificador via localStorage)
    types.ts               (tipos)
  pages/
    DashboardPage.tsx
    InventoryPage.tsx
    NewSalePage.tsx
    PriceCalculatorPage.tsx
    ReportsPage.tsx
    MarketingPlanPage.tsx
    LoginPage.tsx
  ui/
    AppLayout.tsx
    MetricCard.tsx
    PageHeader.tsx
    SectionCard.tsx
    StatusChip.tsx
    ThemeModeProvider.tsx
supabase/
  seed_manual.sql
```

---

## Pré-requisitos

* Node.js 18+ (recomendado 20)
* Projeto Supabase com:

  * Auth habilitado (Email)
  * Tabelas e RLS configuradas
  * RPCs criadas: `apply_sale`, `ensure_daily_tasks`

---

## Setup local

1. Instalar dependências e rodar

```bash
cd Capyops_ml
npm install
npm run dev
```

2. Criar `.env` (Vite)
   Crie um arquivo `.env` na raiz do projeto com:

```env
VITE_SUPABASE_URL=xxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_xxxxxxxxx
```

Abrir:

* [http://localhost:5173](http://localhost:5173)

---

## Supabase (obrigatório)

### 1) Seed inicial (mix de produtos)

Existe um seed manual pronto:

* `supabase/seed_manual.sql`

Como usar:

1. Pegue seu UUID em **Supabase Dashboard → Authentication → Users**
2. Substitua `{{USER_ID}}` pelo UUID
3. Rode o SQL no SQL Editor do Supabase

Esse seed cria:

* `app_settings` para o usuário
* `products` com mix inicial (resina_marmorizada) e preços/custos base

### 2) Observações sobre RLS e RPC

* As tabelas estão com RLS (Row Level Security). Para inserir/atualizar via client, as policies precisam permitir `auth.uid()`.
* O app chama:

  * `rpc('ensure_daily_tasks')` no Dashboard
  * `rpc('apply_sale')` em Nova Venda

Se der erro 403 (RLS), o problema é **policy** (e não o front-end).

---

## Fórmula de precificação (implementada no app)

No Precificador (`/precificador`), o preço final é calculado como:

```
base = custo_produto + embalagem + frete
totalRate = taxaML + CBS + IBS + IS + margem

preco_final = base / (1 - totalRate)
impostos_estimados = preco_final * (CBS + IBS + IS)
```

As taxas são digitadas em **%** e convertidas internamente para fração.

Taxas padrão (salvas em `localStorage`):

* ML: 17
* CBS: 0.9
* IBS: 0.1
* IS: 0
* Margem: 40

Arquivo: `src/lib/taxRates.ts`

---

## Estimativas e notas importantes

* O “lucro estimado” do dashboard é um cálculo simplificado baseado em:

  * taxa ML (padrão 17% quando não informada na venda)
  * custos informados na venda (frete/embalagem/extra)
* A apuração fiscal real depende do regime tributário e das regras aplicáveis. O módulo de impostos aqui é **operacional de precificação**, não substitui contador.

---

## Melhorias recomendadas (próximos commits)

Se você for evoluir a base agora, estas são as melhorias mais valiosas:

1. **Light-first absoluto**

* Remover classes `dark:*` e forçar `ThemeModeProvider` em `light`
* Ajustar `OpeningSplash` para fundo claro (ou opcional)

2. **Evoluir “Compras / Reposição”**

* Página com:

  * sugestão de compra por `min_stock` e giro
  * lista de itens críticos (1 clique para gerar “pedido de compra”)

3. **Relatório com range e exportação**

* Exportar CSV mensal
* Resumo por SKU (lucro estimado por produto)

4. **Modelagem fiscal mais completa**

* Parâmetros por canal (ML/WhatsApp/etc.)
* Opção de “Split Payment” (quando aplicável) como modo informativo

---

## Licença / Uso

Projeto **privado e interno**. Não é SaaS e não foi planejado para distribuição pública sem revisão de segurança, políticas de RLS e tratamento de multiusuário.

---

Se você quiser, eu adapto este README para o padrão “repo público” (com screenshots, roadmap e instruções de deploy) ou para o padrão “manual interno” (mais operacional e menos técnico).
