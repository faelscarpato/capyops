-- Schema additions for reporting fields

alter table public.sales
  add column if not exists region text;

alter table public.supplies
  add column if not exists supplier_name text;
