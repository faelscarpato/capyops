-- =========================================================
-- CapyOps ML — Financeiro + Insumos + Kits de Embalagem
-- Supabase (Postgres) | RLS ON | user_id default auth.uid()
-- =========================================================

-- (Opcional) extensões comuns (em Supabase geralmente já existem)
create extension if not exists pgcrypto;

-- =========================
-- Helpers: updated_at trigger
-- =========================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================
-- 1) EXPENSES (Despesas)
-- =========================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  category text not null,            -- ex: 'embalagem', 'marketing', 'transporte', 'ferramentas', 'taxas'
  amount numeric(12,2) not null check (amount >= 0),
  payment_method text null,          -- ex: 'pix', 'cartao', 'dinheiro', 'boleto'
  vendor text null,                  -- fornecedor / loja
  notes text null,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_user_paid_idx on public.expenses(user_id, paid_at desc);

drop trigger if exists trg_expenses_updated_at on public.expenses;
create trigger trg_expenses_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

alter table public.expenses enable row level security;

drop policy if exists "expenses_select_own" on public.expenses;
create policy "expenses_select_own"
on public.expenses
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "expenses_insert_own" on public.expenses;
create policy "expenses_insert_own"
on public.expenses
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "expenses_update_own" on public.expenses;
create policy "expenses_update_own"
on public.expenses
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "expenses_delete_own" on public.expenses;
create policy "expenses_delete_own"
on public.expenses
for delete
to authenticated
using (user_id = auth.uid());

-- =========================
-- 2) SUPPLIES (Insumos)
-- =========================
create table if not exists public.supplies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,                -- ex: 'Caixa 18x18x25', 'Fita 48mm', 'Plástico bolha'
  category text not null,            -- 'caixa', 'fita', 'bolha', 'etiqueta', 'papel', etc.
  unit text not null default 'un',   -- 'un', 'm', 'rolo', 'folha'
  cost_per_unit numeric(12,4) not null default 0 check (cost_per_unit >= 0),
  stock_qty numeric(12,3) not null default 0 check (stock_qty >= 0), -- permite metros (decimal)
  min_qty numeric(12,3) not null default 0 check (min_qty >= 0),
  notes text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists supplies_user_active_idx on public.supplies(user_id, is_active, name);

drop trigger if exists trg_supplies_updated_at on public.supplies;
create trigger trg_supplies_updated_at
before update on public.supplies
for each row execute function public.set_updated_at();

alter table public.supplies enable row level security;

drop policy if exists "supplies_select_own" on public.supplies;
create policy "supplies_select_own"
on public.supplies
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "supplies_insert_own" on public.supplies;
create policy "supplies_insert_own"
on public.supplies
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "supplies_update_own" on public.supplies;
create policy "supplies_update_own"
on public.supplies
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "supplies_delete_own" on public.supplies;
create policy "supplies_delete_own"
on public.supplies
for delete
to authenticated
using (user_id = auth.uid());

-- =========================
-- 3) PACKING KITS (Kits de embalagem)
-- =========================
create table if not exists public.packing_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,                -- ex: 'Kit 20–23cm', 'Kit 30cm'
  notes text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists packing_kits_user_active_idx on public.packing_kits(user_id, is_active, name);

drop trigger if exists trg_packing_kits_updated_at on public.packing_kits;
create trigger trg_packing_kits_updated_at
before update on public.packing_kits
for each row execute function public.set_updated_at();

alter table public.packing_kits enable row level security;

drop policy if exists "packing_kits_select_own" on public.packing_kits;
create policy "packing_kits_select_own"
on public.packing_kits
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "packing_kits_insert_own" on public.packing_kits;
create policy "packing_kits_insert_own"
on public.packing_kits
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "packing_kits_update_own" on public.packing_kits;
create policy "packing_kits_update_own"
on public.packing_kits
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "packing_kits_delete_own" on public.packing_kits;
create policy "packing_kits_delete_own"
on public.packing_kits
for delete
to authenticated
using (user_id = auth.uid());

-- =========================
-- 4) PACKING KIT ITEMS (itens do kit)
-- =========================
create table if not exists public.packing_kit_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  kit_id uuid not null references public.packing_kits(id) on delete cascade,
  supply_id uuid not null references public.supplies(id) on delete restrict,
  qty_per_order numeric(12,3) not null check (qty_per_order > 0), -- ex: 1 un, 2.5 m
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kit_id, supply_id)
);

create index if not exists packing_kit_items_kit_idx on public.packing_kit_items(kit_id);
create index if not exists packing_kit_items_user_idx on public.packing_kit_items(user_id);

drop trigger if exists trg_packing_kit_items_updated_at on public.packing_kit_items;
create trigger trg_packing_kit_items_updated_at
before update on public.packing_kit_items
for each row execute function public.set_updated_at();

alter table public.packing_kit_items enable row level security;

drop policy if exists "packing_kit_items_select_own" on public.packing_kit_items;
create policy "packing_kit_items_select_own"
on public.packing_kit_items
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "packing_kit_items_insert_own" on public.packing_kit_items;
create policy "packing_kit_items_insert_own"
on public.packing_kit_items
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.packing_kits k
    where k.id = kit_id and k.user_id = auth.uid()
  )
  and exists (
    select 1 from public.supplies s
    where s.id = supply_id and s.user_id = auth.uid()
  )
);

drop policy if exists "packing_kit_items_update_own" on public.packing_kit_items;
create policy "packing_kit_items_update_own"
on public.packing_kit_items
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.packing_kits k
    where k.id = kit_id and k.user_id = auth.uid()
  )
  and exists (
    select 1 from public.supplies s
    where s.id = supply_id and s.user_id = auth.uid()
  )
);

drop policy if exists "packing_kit_items_delete_own" on public.packing_kit_items;
create policy "packing_kit_items_delete_own"
on public.packing_kit_items
for delete
to authenticated
using (user_id = auth.uid());

-- =========================================================
-- RPC opcional 1: calcular custo do kit (sem abater estoque)
-- =========================================================
create or replace function public.get_packing_kit_cost(p_kit_id uuid)
returns numeric
language sql
security definer
set search_path = public
as $$
  select coalesce(sum(i.qty_per_order * s.cost_per_unit), 0)
  from public.packing_kit_items i
  join public.supplies s on s.id = i.supply_id
  join public.packing_kits k on k.id = i.kit_id
  where i.kit_id = p_kit_id
    and k.user_id = auth.uid()
    and i.user_id = auth.uid()
    and s.user_id = auth.uid();
$$;

revoke all on function public.get_packing_kit_cost(uuid) from public;
grant execute on function public.get_packing_kit_cost(uuid) to authenticated;

-- =========================================================
-- RPC opcional 2: aplicar kit (abate insumos) e retorna custo
-- Use isso quando formos integrar no fluxo de venda.
-- =========================================================
create or replace function public.apply_packing_kit(p_kit_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost numeric := 0;
begin
  -- valida posse do kit
  if not exists (
    select 1 from public.packing_kits
    where id = p_kit_id and user_id = auth.uid()
  ) then
    raise exception 'Kit not found or not permitted';
  end if;

  -- calcula custo e abate estoque
  with kit as (
    select i.supply_id, i.qty_per_order
    from public.packing_kit_items i
    where i.kit_id = p_kit_id and i.user_id = auth.uid()
  )
  select coalesce(sum(k.qty_per_order * s.cost_per_unit), 0)
    into v_cost
  from kit k
  join public.supplies s on s.id = k.supply_id
  where s.user_id = auth.uid();

  -- abate estoque (pode falhar se ficar negativo)
  update public.supplies s
  set stock_qty = s.stock_qty - k.qty_per_order
  from (
    select supply_id, qty_per_order
    from public.packing_kit_items
    where kit_id = p_kit_id and user_id = auth.uid()
  ) k
  where s.id = k.supply_id
    and s.user_id = auth.uid();

  -- evita estoque negativo (se quiser bloquear hard)
  if exists (
    select 1 from public.supplies
    where user_id = auth.uid() and stock_qty < 0
  ) then
    raise exception 'Insumo sem estoque suficiente para aplicar o kit';
  end if;

  return v_cost;
end;
$$;

revoke all on function public.apply_packing_kit(uuid) from public;
grant execute on function public.apply_packing_kit(uuid) to authenticated;

-- =========================================================
-- Observação importante:
-- - user_id tem default auth.uid(), então inserts via client NÃO precisam passar user_id
-- - Se você estiver inserindo via SQL manual, inclua user_id explicitamente.
-- =========================================================
