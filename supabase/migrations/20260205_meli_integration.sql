-- Migration: Mercado Livre integration tables
-- Created at: 2026-02-05

-- OAuth states
create table if not exists public.meli_oauth_states (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

alter table public.meli_oauth_states add column if not exists user_id uuid references auth.users(id);
alter table public.meli_oauth_states add column if not exists state text;
alter table public.meli_oauth_states add column if not exists used_at timestamptz;

create index if not exists meli_oauth_states_user_id_idx on public.meli_oauth_states (user_id);
create unique index if not exists meli_oauth_states_state_idx on public.meli_oauth_states (state);

alter table public.meli_oauth_states enable row level security;

drop policy if exists "Users can view their own meli_oauth_states" on public.meli_oauth_states;
create policy "Users can view their own meli_oauth_states" on public.meli_oauth_states for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own meli_oauth_states" on public.meli_oauth_states;
create policy "Users can insert their own meli_oauth_states" on public.meli_oauth_states for insert with check (auth.uid() = user_id);

-- Accounts
create table if not exists public.meli_accounts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.meli_accounts add column if not exists user_id uuid references auth.users(id);
alter table public.meli_accounts add column if not exists ml_user_id text;
alter table public.meli_accounts add column if not exists nickname text;
alter table public.meli_accounts add column if not exists access_token text;
alter table public.meli_accounts add column if not exists refresh_token text;
alter table public.meli_accounts add column if not exists expires_at timestamptz;
alter table public.meli_accounts add column if not exists status text;
alter table public.meli_accounts add column if not exists scope text;

create unique index if not exists meli_accounts_user_id_idx on public.meli_accounts (user_id);
create unique index if not exists meli_accounts_ml_user_id_idx on public.meli_accounts (ml_user_id);

alter table public.meli_accounts enable row level security;

drop policy if exists "Users can view their own meli_accounts" on public.meli_accounts;
create policy "Users can view their own meli_accounts" on public.meli_accounts for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own meli_accounts" on public.meli_accounts;
create policy "Users can insert their own meli_accounts" on public.meli_accounts for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own meli_accounts" on public.meli_accounts;
create policy "Users can update their own meli_accounts" on public.meli_accounts for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own meli_accounts" on public.meli_accounts;
create policy "Users can delete their own meli_accounts" on public.meli_accounts for delete using (auth.uid() = user_id);

-- Webhook events
create table if not exists public.meli_webhook_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

alter table public.meli_webhook_events add column if not exists user_id uuid references auth.users(id);
alter table public.meli_webhook_events add column if not exists topic text;
alter table public.meli_webhook_events add column if not exists resource text;
alter table public.meli_webhook_events add column if not exists payload jsonb;
alter table public.meli_webhook_events add column if not exists status text;
alter table public.meli_webhook_events add column if not exists processed_at timestamptz;
alter table public.meli_webhook_events add column if not exists error text;

create index if not exists meli_webhook_events_status_idx on public.meli_webhook_events (status);
create index if not exists meli_webhook_events_user_id_idx on public.meli_webhook_events (user_id);

alter table public.meli_webhook_events enable row level security;

drop policy if exists "Users can view their own meli_webhook_events" on public.meli_webhook_events;
create policy "Users can view their own meli_webhook_events" on public.meli_webhook_events for select using (auth.uid() = user_id);

-- Domain tables
create table if not exists public.meli_orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.meli_orders add column if not exists user_id uuid references auth.users(id);
alter table public.meli_orders add column if not exists ml_order_id text;
alter table public.meli_orders add column if not exists status text;
alter table public.meli_orders add column if not exists payload jsonb;
create unique index if not exists meli_orders_ml_order_id_idx on public.meli_orders (ml_order_id);
create index if not exists meli_orders_user_id_idx on public.meli_orders (user_id);

alter table public.meli_orders enable row level security;

drop policy if exists "Users can view their own meli_orders" on public.meli_orders;
create policy "Users can view their own meli_orders" on public.meli_orders for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own meli_orders" on public.meli_orders;
create policy "Users can insert their own meli_orders" on public.meli_orders for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own meli_orders" on public.meli_orders;
create policy "Users can update their own meli_orders" on public.meli_orders for update using (auth.uid() = user_id);

create table if not exists public.meli_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.meli_messages add column if not exists user_id uuid references auth.users(id);
alter table public.meli_messages add column if not exists ml_message_id text;
alter table public.meli_messages add column if not exists payload jsonb;
create unique index if not exists meli_messages_ml_message_id_idx on public.meli_messages (ml_message_id);
create index if not exists meli_messages_user_id_idx on public.meli_messages (user_id);

alter table public.meli_messages enable row level security;

drop policy if exists "Users can view their own meli_messages" on public.meli_messages;
create policy "Users can view their own meli_messages" on public.meli_messages for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own meli_messages" on public.meli_messages;
create policy "Users can insert their own meli_messages" on public.meli_messages for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own meli_messages" on public.meli_messages;
create policy "Users can update their own meli_messages" on public.meli_messages for update using (auth.uid() = user_id);

create table if not exists public.meli_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.meli_feedback add column if not exists user_id uuid references auth.users(id);
alter table public.meli_feedback add column if not exists ml_feedback_id text;
alter table public.meli_feedback add column if not exists payload jsonb;
create unique index if not exists meli_feedback_ml_feedback_id_idx on public.meli_feedback (ml_feedback_id);
create index if not exists meli_feedback_user_id_idx on public.meli_feedback (user_id);

alter table public.meli_feedback enable row level security;

drop policy if exists "Users can view their own meli_feedback" on public.meli_feedback;
create policy "Users can view their own meli_feedback" on public.meli_feedback for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own meli_feedback" on public.meli_feedback;
create policy "Users can insert their own meli_feedback" on public.meli_feedback for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own meli_feedback" on public.meli_feedback;
create policy "Users can update their own meli_feedback" on public.meli_feedback for update using (auth.uid() = user_id);

create table if not exists public.meli_shipments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.meli_shipments add column if not exists user_id uuid references auth.users(id);
alter table public.meli_shipments add column if not exists ml_shipment_id text;
alter table public.meli_shipments add column if not exists status text;
alter table public.meli_shipments add column if not exists payload jsonb;
create unique index if not exists meli_shipments_ml_shipment_id_idx on public.meli_shipments (ml_shipment_id);
create index if not exists meli_shipments_user_id_idx on public.meli_shipments (user_id);

alter table public.meli_shipments enable row level security;

drop policy if exists "Users can view their own meli_shipments" on public.meli_shipments;
create policy "Users can view their own meli_shipments" on public.meli_shipments for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own meli_shipments" on public.meli_shipments;
create policy "Users can insert their own meli_shipments" on public.meli_shipments for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own meli_shipments" on public.meli_shipments;
create policy "Users can update their own meli_shipments" on public.meli_shipments for update using (auth.uid() = user_id);

-- Internal events
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

alter table public.events add column if not exists user_id uuid references auth.users(id);
alter table public.events add column if not exists type text;
alter table public.events add column if not exists title text;
alter table public.events add column if not exists body text;
alter table public.events add column if not exists payload jsonb;
alter table public.events add column if not exists read_at timestamptz;

create index if not exists events_user_id_idx on public.events (user_id);
create index if not exists events_read_at_idx on public.events (read_at);

alter table public.events enable row level security;

drop policy if exists "Users can view their own events" on public.events;
create policy "Users can view their own events" on public.events for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own events" on public.events;
create policy "Users can insert their own events" on public.events for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own events" on public.events;
create policy "Users can update their own events" on public.events for update using (auth.uid() = user_id);
