-- Migration: Fix ml_item_id not-null constraint / backfill
-- Created at: 2026-02-05
-- Purpose: evitar erro de null em ml_item_id ao salvar produtos com ml_listing_id.

-- Ensure column exists
alter table public.ml_listings add column if not exists ml_item_id text;

-- Backfill existing rows (se houver)
update public.ml_listings
set ml_item_id = coalesce(ml_item_id, ml_listing_id)
where ml_item_id is null;

-- Opcional: permitir null caso inserts externos não informem
alter table public.ml_listings alter column ml_item_id drop not null;
