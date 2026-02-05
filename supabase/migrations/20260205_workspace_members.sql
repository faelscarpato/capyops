-- Migration: workspace members for shared access
-- Created at: 2026-02-05

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

alter table public.workspace_members add column if not exists owner_id uuid references auth.users(id);
alter table public.workspace_members add column if not exists member_id uuid references auth.users(id);
alter table public.workspace_members add column if not exists role text;

create unique index if not exists workspace_members_owner_member_idx on public.workspace_members (owner_id, member_id);
create index if not exists workspace_members_member_idx on public.workspace_members (member_id);

alter table public.workspace_members enable row level security;

drop policy if exists "Members can view their workspace memberships" on public.workspace_members;
create policy "Members can view their workspace memberships" on public.workspace_members for select
  using (auth.uid() = owner_id or auth.uid() = member_id);

drop policy if exists "Owners can insert workspace members" on public.workspace_members;
create policy "Owners can insert workspace members" on public.workspace_members for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Owners can update workspace members" on public.workspace_members;
create policy "Owners can update workspace members" on public.workspace_members for update
  using (auth.uid() = owner_id);

drop policy if exists "Owners can delete workspace members" on public.workspace_members;
create policy "Owners can delete workspace members" on public.workspace_members for delete
  using (auth.uid() = owner_id);

-- Helper function
create or replace function public.is_workspace_member(owner uuid)
returns boolean
language sql
stable
as $$
  select auth.uid() = owner
     or exists (
       select 1 from public.workspace_members wm
       where wm.owner_id = owner and wm.member_id = auth.uid()
     );
$$;

-- Update RLS policies to allow workspace members (owner_id = user_id)

-- products
alter table public.products enable row level security;

drop policy if exists "Users can view their own products" on public.products;
drop policy if exists "Users can insert their own products" on public.products;
drop policy if exists "Users can update their own products" on public.products;
drop policy if exists "Users can delete their own products" on public.products;

create policy "Workspace can view products" on public.products for select using (public.is_workspace_member(user_id));
create policy "Workspace can insert products" on public.products for insert with check (public.is_workspace_member(user_id));
create policy "Workspace can update products" on public.products for update using (public.is_workspace_member(user_id));
create policy "Workspace can delete products" on public.products for delete using (public.is_workspace_member(user_id));

-- sales
alter table public.sales enable row level security;

drop policy if exists "Users can view their own sales" on public.sales;
drop policy if exists "Users can insert their own sales" on public.sales;
drop policy if exists "Users can update their own sales" on public.sales;
drop policy if exists "Users can delete their own sales" on public.sales;

create policy "Workspace can view sales" on public.sales for select using (public.is_workspace_member(user_id));
create policy "Workspace can insert sales" on public.sales for insert with check (public.is_workspace_member(user_id));
create policy "Workspace can update sales" on public.sales for update using (public.is_workspace_member(user_id));
create policy "Workspace can delete sales" on public.sales for delete using (public.is_workspace_member(user_id));

-- expenses
alter table public.expenses enable row level security;

drop policy if exists "Users can view their own expenses" on public.expenses;
drop policy if exists "Users can insert their own expenses" on public.expenses;
drop policy if exists "Users can update their own expenses" on public.expenses;
drop policy if exists "Users can delete their own expenses" on public.expenses;

create policy "Workspace can view expenses" on public.expenses for select using (public.is_workspace_member(user_id));
create policy "Workspace can insert expenses" on public.expenses for insert with check (public.is_workspace_member(user_id));
create policy "Workspace can update expenses" on public.expenses for update using (public.is_workspace_member(user_id));
create policy "Workspace can delete expenses" on public.expenses for delete using (public.is_workspace_member(user_id));

-- supplies
alter table public.supplies enable row level security;

drop policy if exists "Users can view their own supplies" on public.supplies;
drop policy if exists "Users can insert their own supplies" on public.supplies;
drop policy if exists "Users can update their own supplies" on public.supplies;
drop policy if exists "Users can delete their own supplies" on public.supplies;

create policy "Workspace can view supplies" on public.supplies for select using (public.is_workspace_member(user_id));
create policy "Workspace can insert supplies" on public.supplies for insert with check (public.is_workspace_member(user_id));
create policy "Workspace can update supplies" on public.supplies for update using (public.is_workspace_member(user_id));
create policy "Workspace can delete supplies" on public.supplies for delete using (public.is_workspace_member(user_id));

-- packing_kits
alter table public.packing_kits enable row level security;

drop policy if exists "Users can view their own packing_kits" on public.packing_kits;
drop policy if exists "Users can insert their own packing_kits" on public.packing_kits;
drop policy if exists "Users can update their own packing_kits" on public.packing_kits;
drop policy if exists "Users can delete their own packing_kits" on public.packing_kits;

create policy "Workspace can view packing_kits" on public.packing_kits for select using (public.is_workspace_member(user_id));
create policy "Workspace can insert packing_kits" on public.packing_kits for insert with check (public.is_workspace_member(user_id));
create policy "Workspace can update packing_kits" on public.packing_kits for update using (public.is_workspace_member(user_id));
create policy "Workspace can delete packing_kits" on public.packing_kits for delete using (public.is_workspace_member(user_id));

-- packing_kit_items
alter table public.packing_kit_items enable row level security;

drop policy if exists "Users can view their own packing_kit_items" on public.packing_kit_items;
drop policy if exists "Users can insert their own packing_kit_items" on public.packing_kit_items;
drop policy if exists "Users can update their own packing_kit_items" on public.packing_kit_items;
drop policy if exists "Users can delete their own packing_kit_items" on public.packing_kit_items;

create policy "Workspace can view packing_kit_items" on public.packing_kit_items for select using (public.is_workspace_member(user_id));
create policy "Workspace can insert packing_kit_items" on public.packing_kit_items for insert with check (public.is_workspace_member(user_id));
create policy "Workspace can update packing_kit_items" on public.packing_kit_items for update using (public.is_workspace_member(user_id));
create policy "Workspace can delete packing_kit_items" on public.packing_kit_items for delete using (public.is_workspace_member(user_id));

-- purchase_quotes
alter table public.purchase_quotes enable row level security;

drop policy if exists "Users can view their own purchase_quotes" on public.purchase_quotes;
drop policy if exists "Users can insert their own purchase_quotes" on public.purchase_quotes;
drop policy if exists "Users can update their own purchase_quotes" on public.purchase_quotes;
drop policy if exists "Users can delete their own purchase_quotes" on public.purchase_quotes;

create policy "Workspace can view purchase_quotes" on public.purchase_quotes for select using (public.is_workspace_member(user_id));
create policy "Workspace can insert purchase_quotes" on public.purchase_quotes for insert with check (public.is_workspace_member(user_id));
create policy "Workspace can update purchase_quotes" on public.purchase_quotes for update using (public.is_workspace_member(user_id));
create policy "Workspace can delete purchase_quotes" on public.purchase_quotes for delete using (public.is_workspace_member(user_id));

-- purchase_quote_items
alter table public.purchase_quote_items enable row level security;

drop policy if exists "Users can view their own purchase_quote_items" on public.purchase_quote_items;
drop policy if exists "Users can insert their own purchase_quote_items" on public.purchase_quote_items;
drop policy if exists "Users can update their own purchase_quote_items" on public.purchase_quote_items;
drop policy if exists "Users can delete their own purchase_quote_items" on public.purchase_quote_items;

create policy "Workspace can view purchase_quote_items" on public.purchase_quote_items for select using (public.is_workspace_member(user_id));
create policy "Workspace can insert purchase_quote_items" on public.purchase_quote_items for insert with check (public.is_workspace_member(user_id));
create policy "Workspace can update purchase_quote_items" on public.purchase_quote_items for update using (public.is_workspace_member(user_id));
create policy "Workspace can delete purchase_quote_items" on public.purchase_quote_items for delete using (public.is_workspace_member(user_id));

-- ml_listings
alter table public.ml_listings enable row level security;

drop policy if exists "Users can view their own listings" on public.ml_listings;
drop policy if exists "Users can insert their own listings" on public.ml_listings;
drop policy if exists "Users can update their own listings" on public.ml_listings;
drop policy if exists "Users can delete their own listings" on public.ml_listings;

create policy "Workspace can view listings" on public.ml_listings for select using (public.is_workspace_member(user_id));
create policy "Workspace can insert listings" on public.ml_listings for insert with check (public.is_workspace_member(user_id));
create policy "Workspace can update listings" on public.ml_listings for update using (public.is_workspace_member(user_id));
create policy "Workspace can delete listings" on public.ml_listings for delete using (public.is_workspace_member(user_id));

-- competitor_tracking
alter table public.competitor_tracking enable row level security;

drop policy if exists "Users can view their own competitor_tracking" on public.competitor_tracking;
drop policy if exists "Users can insert their own competitor_tracking" on public.competitor_tracking;
drop policy if exists "Users can update their own competitor_tracking" on public.competitor_tracking;
drop policy if exists "Users can delete their own competitor_tracking" on public.competitor_tracking;

create policy "Workspace can view competitor_tracking" on public.competitor_tracking for select using (public.is_workspace_member(user_id));
create policy "Workspace can insert competitor_tracking" on public.competitor_tracking for insert with check (public.is_workspace_member(user_id));
create policy "Workspace can update competitor_tracking" on public.competitor_tracking for update using (public.is_workspace_member(user_id));
create policy "Workspace can delete competitor_tracking" on public.competitor_tracking for delete using (public.is_workspace_member(user_id));

-- clients
alter table public.clients enable row level security;

drop policy if exists "Users can view their own clients" on public.clients;
drop policy if exists "Users can insert their own clients" on public.clients;
drop policy if exists "Users can update their own clients" on public.clients;
drop policy if exists "Users can delete their own clients" on public.clients;

create policy "Workspace can view clients" on public.clients for select using (public.is_workspace_member(user_id));
create policy "Workspace can insert clients" on public.clients for insert with check (public.is_workspace_member(user_id));
create policy "Workspace can update clients" on public.clients for update using (public.is_workspace_member(user_id));
create policy "Workspace can delete clients" on public.clients for delete using (public.is_workspace_member(user_id));

-- suppliers
alter table public.suppliers enable row level security;

drop policy if exists "Users can view their own suppliers" on public.suppliers;
drop policy if exists "Users can insert their own suppliers" on public.suppliers;
drop policy if exists "Users can update their own suppliers" on public.suppliers;
drop policy if exists "Users can delete their own suppliers" on public.suppliers;

create policy "Workspace can view suppliers" on public.suppliers for select using (public.is_workspace_member(user_id));
create policy "Workspace can insert suppliers" on public.suppliers for insert with check (public.is_workspace_member(user_id));
create policy "Workspace can update suppliers" on public.suppliers for update using (public.is_workspace_member(user_id));
create policy "Workspace can delete suppliers" on public.suppliers for delete using (public.is_workspace_member(user_id));

-- stock_movements
alter table public.stock_movements enable row level security;

drop policy if exists "Users can view their own stock movements" on public.stock_movements;
drop policy if exists "Users can insert their own stock movements" on public.stock_movements;

create policy "Workspace can view stock_movements" on public.stock_movements for select using (public.is_workspace_member(user_id));
create policy "Workspace can insert stock_movements" on public.stock_movements for insert with check (public.is_workspace_member(user_id));

-- meli_accounts
alter table public.meli_accounts enable row level security;

drop policy if exists "Users can view their own meli_accounts" on public.meli_accounts;
drop policy if exists "Users can insert their own meli_accounts" on public.meli_accounts;
drop policy if exists "Users can update their own meli_accounts" on public.meli_accounts;
drop policy if exists "Users can delete their own meli_accounts" on public.meli_accounts;

create policy "Workspace can view meli_accounts" on public.meli_accounts for select using (public.is_workspace_member(user_id));
create policy "Workspace can insert meli_accounts" on public.meli_accounts for insert with check (public.is_workspace_member(user_id));
create policy "Workspace can update meli_accounts" on public.meli_accounts for update using (public.is_workspace_member(user_id));
create policy "Workspace can delete meli_accounts" on public.meli_accounts for delete using (public.is_workspace_member(user_id));

-- meli_webhook_events
alter table public.meli_webhook_events enable row level security;

drop policy if exists "Users can view their own meli_webhook_events" on public.meli_webhook_events;

create policy "Workspace can view meli_webhook_events" on public.meli_webhook_events for select using (public.is_workspace_member(user_id));

-- meli_orders/messages/feedback/shipments
alter table public.meli_orders enable row level security;

drop policy if exists "Users can view their own meli_orders" on public.meli_orders;
drop policy if exists "Users can insert their own meli_orders" on public.meli_orders;
drop policy if exists "Users can update their own meli_orders" on public.meli_orders;

create policy "Workspace can view meli_orders" on public.meli_orders for select using (public.is_workspace_member(user_id));
create policy "Workspace can insert meli_orders" on public.meli_orders for insert with check (public.is_workspace_member(user_id));
create policy "Workspace can update meli_orders" on public.meli_orders for update using (public.is_workspace_member(user_id));

alter table public.meli_messages enable row level security;

drop policy if exists "Users can view their own meli_messages" on public.meli_messages;
drop policy if exists "Users can insert their own meli_messages" on public.meli_messages;
drop policy if exists "Users can update their own meli_messages" on public.meli_messages;

create policy "Workspace can view meli_messages" on public.meli_messages for select using (public.is_workspace_member(user_id));
create policy "Workspace can insert meli_messages" on public.meli_messages for insert with check (public.is_workspace_member(user_id));
create policy "Workspace can update meli_messages" on public.meli_messages for update using (public.is_workspace_member(user_id));

alter table public.meli_feedback enable row level security;

drop policy if exists "Users can view their own meli_feedback" on public.meli_feedback;
drop policy if exists "Users can insert their own meli_feedback" on public.meli_feedback;
drop policy if exists "Users can update their own meli_feedback" on public.meli_feedback;

create policy "Workspace can view meli_feedback" on public.meli_feedback for select using (public.is_workspace_member(user_id));
create policy "Workspace can insert meli_feedback" on public.meli_feedback for insert with check (public.is_workspace_member(user_id));
create policy "Workspace can update meli_feedback" on public.meli_feedback for update using (public.is_workspace_member(user_id));

alter table public.meli_shipments enable row level security;

drop policy if exists "Users can view their own meli_shipments" on public.meli_shipments;
drop policy if exists "Users can insert their own meli_shipments" on public.meli_shipments;
drop policy if exists "Users can update their own meli_shipments" on public.meli_shipments;

create policy "Workspace can view meli_shipments" on public.meli_shipments for select using (public.is_workspace_member(user_id));
create policy "Workspace can insert meli_shipments" on public.meli_shipments for insert with check (public.is_workspace_member(user_id));
create policy "Workspace can update meli_shipments" on public.meli_shipments for update using (public.is_workspace_member(user_id));

-- events
alter table public.events enable row level security;

drop policy if exists "Users can view their own events" on public.events;
drop policy if exists "Users can insert their own events" on public.events;
drop policy if exists "Users can update their own events" on public.events;

create policy "Workspace can view events" on public.events for select using (public.is_workspace_member(user_id));
create policy "Workspace can insert events" on public.events for insert with check (public.is_workspace_member(user_id));
create policy "Workspace can update events" on public.events for update using (public.is_workspace_member(user_id));
