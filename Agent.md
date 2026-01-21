# CapyOps ML — Reconhecimento do projeto (Agent)

## Visao geral
- App interno (privado) para operacao diaria de loja no Mercado Livre (Normal-first)
- Stack: React + Vite + TypeScript, Tailwind CSS, Supabase (Auth + Postgres + RPC)
- Foco: estoque, vendas, precificacao com impostos (CBS/IBS/IS), despesas e kits de embalagem

## Estrutura de pastas (alto nivel)
- `src/` app React
  - `pages/` telas principais
  - `lib/` client Supabase, tipos e funcoes de dados
  - `ui/` layout e componentes base
  - `components/` splash e shell alternativo
- `supabase/` scripts SQL (seed e tabelas extras)
- `dist/` build

## Rotas principais
- `/` Dashboard (tarefas do dia, alertas, vendas e impostos)
- `/estoque` Estoque de produtos
- `/insumos` Insumos de embalagem
- `/kits-embalagem` Kits de embalagem (packing)
- `/orcamentos` Orcamentos de compra para fornecedores
- `/nova-venda` Registro de venda (RPC `apply_sale`)
- `/precificador` Precificacao com CBS/IBS/IS
- `/relatorios` Resumo de vendas por periodo
- `/plano-marketing` Documento operacional
- `/login` Autenticacao

## Principais entidades (Supabase)
- `products` (produtos)
  - campos base: `name`, `variant`, `size_cm`, `cost`, `price`, `stock`, `min_stock`
  - campo novo: `packing_kit_id` (associacao com kit de embalagem)
- `sales` (vendas)
  - inclui `packaging_cost`, `shipping_cost`, `ml_fee_rate`, `extra_cost`
- `supplies` (insumos de embalagem)
  - `cost_per_unit`, `stock_qty`, `min_qty`
- `packing_kits` (kits)
- `packing_kit_items` (itens do kit)
- `purchase_quotes` (orcamentos de compra)
- `purchase_quote_items` (itens do orcamento)
- `expenses` (despesas)
- `daily_tasks` (tarefas diarias)

## RPCs usadas
- `apply_sale` — registra venda + baixa estoque de produto
- `ensure_daily_tasks` — garante tarefas do dia
- `apply_packing_kit` — abate insumos e retorna custo do kit
- `get_packing_kit_cost` — calcula custo do kit sem abater estoque

## Fluxos principais
- Estoque (`/estoque`): CRUD rapido de produtos; agora permite vincular kit de embalagem
- Insumos (`/insumos`): CRUD de insumos e custos por unidade
- Kits (`/kits-embalagem`): kit com itens e custo total visivel (soma de insumos)
- Nova venda (`/nova-venda`): registra venda; opcionalmente aplica kit de embalagem e grava `packaging_cost`
- Precificador (`/precificador`): calcula preco com taxas; opcionalmente preenche custo do estoque + kit

## Ponto de atencao de schema
- Para suportar o kit por produto, a tabela `products` precisa do campo `packing_kit_id`
- O custo de embalagem em venda usa `packaging_cost`, gravado no registro de `sales`

## Arquivos chave
- `src/lib/db.ts` — queries e chamadas RPC do Supabase
- `src/lib/types.ts` — tipos do dominio
- `src/pages/NewSalePage.tsx` — venda + embalagem
- `src/pages/PriceCalculatorPage.tsx` — precificador
- `src/pages/PackingKitsPage.tsx` — kits de embalagem
- `supabase/Financeiro_Insumos_kit.sql` — tabelas de insumos/kits + RPCs

## Configuracao local
- Variaveis `.env`:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- Run dev:
  - `npm install`
  - `npm run dev`
