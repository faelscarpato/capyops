-- Adiciona vinculo de kit de embalagem aos produtos
alter table public.products
  add column if not exists packing_kit_id uuid null references public.packing_kits(id);

create index if not exists products_user_packing_kit_idx
  on public.products(user_id, packing_kit_id);
