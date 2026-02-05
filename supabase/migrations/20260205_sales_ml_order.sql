-- Migration: add ML order id to sales
-- Created at: 2026-02-05

alter table public.sales add column if not exists ml_order_id text;
create index if not exists sales_ml_order_id_idx on public.sales (ml_order_id);
