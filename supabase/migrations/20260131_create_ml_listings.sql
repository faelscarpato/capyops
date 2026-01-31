-- Migration: Create ml_listings table
-- Created at: 2026-01-31
-- Purpose: Fix "column listed_at does not exist" error and ensure table exists.

create table if not exists public.ml_listings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure columns exist (idempotent)
alter table public.ml_listings add column if not exists user_id uuid references auth.users(id);

-- ML specific fields
alter table public.ml_listings add column if not exists ml_listing_id text;
alter table public.ml_listings add column if not exists title text;
alter table public.ml_listings add column if not exists url text;
alter table public.ml_listings add column if not exists price numeric;
alter table public.ml_listings add column if not exists status text;
alter table public.ml_listings add column if not exists permalink text;
alter table public.ml_listings add column if not exists thumbnail text;
alter table public.ml_listings add column if not exists sold_quantity integer;
alter table public.ml_listings add column if not exists visits integer;

-- Detailed fields
alter table public.ml_listings add column if not exists images_count integer;
alter table public.ml_listings add column if not exists description_chars integer;
alter table public.ml_listings add column if not exists has_full_description boolean;
alter table public.ml_listings add column if not exists listed_at timestamptz;
alter table public.ml_listings add column if not exists notes text;

-- Constraints
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ml_listings_ml_listing_id_key') then
    alter table public.ml_listings add constraint ml_listings_ml_listing_id_key unique (ml_listing_id);
  end if;
end $$;

-- Policies
alter table public.ml_listings enable row level security;

drop policy if exists "Users can view their own listings" on public.ml_listings;
create policy "Users can view their own listings" on public.ml_listings for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own listings" on public.ml_listings;
create policy "Users can insert their own listings" on public.ml_listings for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own listings" on public.ml_listings;
create policy "Users can update their own listings" on public.ml_listings for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own listings" on public.ml_listings;
create policy "Users can delete their own listings" on public.ml_listings for delete using (auth.uid() = user_id);
