-- Migration: Add CRM and Logistics tables (Clients, Suppliers, Stock Movements)
-- Created at: 2026-01-31
-- Updated to be idempotent (ADD COLUMN IF NOT EXISTS) to fix validation errors on existing tables.

-- 1. Clients Table (Base for PF and PJ)
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure columns exist (safe for existing tables)
alter table public.clients add column if not exists user_id uuid references auth.users(id);
alter table public.clients add column if not exists type text check (type in ('PF', 'PJ'));
alter table public.clients add column if not exists name text;
alter table public.clients add column if not exists document text;
alter table public.clients add column if not exists email text;
alter table public.clients add column if not exists phone text;
alter table public.clients add column if not exists address text;
alter table public.clients add column if not exists city text;
alter table public.clients add column if not exists state text;
alter table public.clients add column if not exists zip_code text;
alter table public.clients add column if not exists notes text;

alter table public.clients enable row level security;

-- Policies (Drop first to avoid conflicts if they exist?) 
-- Supabase Studio might error if policy exists. Better to drop if exists.
drop policy if exists "Users can view their own clients" on public.clients;
create policy "Users can view their own clients" on public.clients for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own clients" on public.clients;
create policy "Users can insert their own clients" on public.clients for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own clients" on public.clients;
create policy "Users can update their own clients" on public.clients for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own clients" on public.clients;
create policy "Users can delete their own clients" on public.clients for delete using (auth.uid() = user_id);


-- 2. Suppliers Table
create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.suppliers add column if not exists user_id uuid references auth.users(id);
alter table public.suppliers add column if not exists name text;
alter table public.suppliers add column if not exists contact_name text;
alter table public.suppliers add column if not exists email text;
alter table public.suppliers add column if not exists phone text;
alter table public.suppliers add column if not exists website text;
alter table public.suppliers add column if not exists doc_cnpj text;
alter table public.suppliers add column if not exists address text;
alter table public.suppliers add column if not exists lead_time_days integer;
alter table public.suppliers add column if not exists notes text;

alter table public.suppliers enable row level security;

drop policy if exists "Users can view their own suppliers" on public.suppliers;
create policy "Users can view their own suppliers" on public.suppliers for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own suppliers" on public.suppliers;
create policy "Users can insert their own suppliers" on public.suppliers for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own suppliers" on public.suppliers;
create policy "Users can update their own suppliers" on public.suppliers for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own suppliers" on public.suppliers;
create policy "Users can delete their own suppliers" on public.suppliers for delete using (auth.uid() = user_id);


-- 3. Stock Movements (Audit Log)
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

alter table public.stock_movements add column if not exists user_id uuid references auth.users(id);
alter table public.stock_movements add column if not exists product_id uuid references public.products(id) on delete cascade;
alter table public.stock_movements add column if not exists type text check (type in ('IN', 'OUT', 'ADJUST', 'SALE', 'RETURN'));
alter table public.stock_movements add column if not exists quantity integer;
alter table public.stock_movements add column if not exists previous_stock integer;
alter table public.stock_movements add column if not exists new_stock integer;
alter table public.stock_movements add column if not exists reference_id text;
alter table public.stock_movements add column if not exists notes text;

alter table public.stock_movements enable row level security;

drop policy if exists "Users can view their own stock movements" on public.stock_movements;
create policy "Users can view their own stock movements" on public.stock_movements for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own stock movements" on public.stock_movements;
create policy "Users can insert their own stock movements" on public.stock_movements for insert with check (auth.uid() = user_id);


-- 4. Alter Products Table (Add Weight)
alter table public.products add column if not exists weight_kg numeric(10,3);
