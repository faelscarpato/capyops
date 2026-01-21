-- =========================================================
-- CapyOps ML — Orcamentos de compra / pedido para fornecedor
-- Supabase (Postgres) | RLS ON | user_id default auth.uid()
-- =========================================================

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
-- 1) PURCHASE_QUOTES (Orcamentos)
-- =========================
create table if not exists public.purchase_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  supplier_name text not null,
  title text null,
  status text not null default 'draft',
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchase_quotes_user_idx on public.purchase_quotes(user_id, created_at desc);

drop trigger if exists trg_purchase_quotes_updated_at on public.purchase_quotes;
create trigger trg_purchase_quotes_updated_at
before update on public.purchase_quotes
for each row execute function public.set_updated_at();

alter table public.purchase_quotes enable row level security;

drop policy if exists "purchase_quotes_select_own" on public.purchase_quotes;
create policy "purchase_quotes_select_own"
on public.purchase_quotes
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "purchase_quotes_insert_own" on public.purchase_quotes;
create policy "purchase_quotes_insert_own"
on public.purchase_quotes
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "purchase_quotes_update_own" on public.purchase_quotes;
create policy "purchase_quotes_update_own"
on public.purchase_quotes
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "purchase_quotes_delete_own" on public.purchase_quotes;
create policy "purchase_quotes_delete_own"
on public.purchase_quotes
for delete
to authenticated
using (user_id = auth.uid());

-- =========================
-- 2) PURCHASE_QUOTE_ITEMS (Itens)
-- =========================
create table if not exists public.purchase_quote_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  quote_id uuid not null references public.purchase_quotes(id) on delete cascade,
  supply_id uuid null references public.supplies(id) on delete set null,
  description text not null,
  unit text not null default 'un',
  qty numeric(12,3) not null check (qty >= 0),
  unit_cost numeric(12,4) not null check (unit_cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchase_quote_items_quote_idx on public.purchase_quote_items(quote_id);
create index if not exists purchase_quote_items_user_idx on public.purchase_quote_items(user_id);

drop trigger if exists trg_purchase_quote_items_updated_at on public.purchase_quote_items;
create trigger trg_purchase_quote_items_updated_at
before update on public.purchase_quote_items
for each row execute function public.set_updated_at();

alter table public.purchase_quote_items enable row level security;

drop policy if exists "purchase_quote_items_select_own" on public.purchase_quote_items;
create policy "purchase_quote_items_select_own"
on public.purchase_quote_items
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "purchase_quote_items_insert_own" on public.purchase_quote_items;
create policy "purchase_quote_items_insert_own"
on public.purchase_quote_items
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.purchase_quotes q
    where q.id = quote_id and q.user_id = auth.uid()
  )
);

drop policy if exists "purchase_quote_items_update_own" on public.purchase_quote_items;
create policy "purchase_quote_items_update_own"
on public.purchase_quote_items
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.purchase_quotes q
    where q.id = quote_id and q.user_id = auth.uid()
  )
);

drop policy if exists "purchase_quote_items_delete_own" on public.purchase_quote_items;
create policy "purchase_quote_items_delete_own"
on public.purchase_quote_items
for delete
to authenticated
using (user_id = auth.uid());
