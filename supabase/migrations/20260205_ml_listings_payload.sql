-- Migration: enrich ml_listings for sync payload
-- Created at: 2026-02-05

alter table public.ml_listings add column if not exists payload jsonb;
alter table public.ml_listings add column if not exists last_sync_at timestamptz;
