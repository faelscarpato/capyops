-- Schema additions for ML Q&A and competitor tracking
-- Execute in Supabase SQL editor after confirming RLS needs.

create table if not exists public.ml_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ml_question_id text,
  item_id text,
  product_id uuid references public.products(id) on delete set null,
  buyer_nickname text,
  question_text text not null,
  status text not null default 'pending',
  received_at timestamptz not null default now(),
  answered_at timestamptz,
  answer_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.competitor_tracking (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  my_product_id uuid not null references public.products(id) on delete cascade,
  competitor_mlb_id text not null,
  last_price numeric,
  target_price numeric,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, my_product_id, competitor_mlb_id)
);

alter table public.ml_questions enable row level security;
alter table public.competitor_tracking enable row level security;

create policy "ml_questions_select" on public.ml_questions
  for select using (auth.uid() = user_id);
create policy "ml_questions_insert" on public.ml_questions
  for insert with check (auth.uid() = user_id);
create policy "ml_questions_update" on public.ml_questions
  for update using (auth.uid() = user_id);
create policy "ml_questions_delete" on public.ml_questions
  for delete using (auth.uid() = user_id);

create policy "competitor_tracking_select" on public.competitor_tracking
  for select using (auth.uid() = user_id);
create policy "competitor_tracking_insert" on public.competitor_tracking
  for insert with check (auth.uid() = user_id);
create policy "competitor_tracking_update" on public.competitor_tracking
  for update using (auth.uid() = user_id);
create policy "competitor_tracking_delete" on public.competitor_tracking
  for delete using (auth.uid() = user_id);
