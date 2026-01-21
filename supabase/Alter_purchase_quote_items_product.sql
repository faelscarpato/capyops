-- Adiciona vinculo de produto aos itens do orcamento
alter table public.purchase_quote_items
  add column if not exists product_id uuid null references public.products(id) on delete set null;

create index if not exists purchase_quote_items_product_idx
  on public.purchase_quote_items(product_id);
