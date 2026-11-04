-- Truss multitenant schema
-- Run this once in Supabase SQL editor for production-ready per-user persistence.

create extension if not exists pgcrypto;

create table if not exists public.user_page_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dashboard_state jsonb not null default '{}'::jsonb,
  main_dashboard_state jsonb not null default '{}'::jsonb,
  truss_intelligence_state jsonb not null default '{}'::jsonb,
  truss_connect_state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.truss_connect_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'LINKEDIN',
  account_id text,
  status text not null default 'DISCONNECTED',
  connected_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.truss_connect_send_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipient_key text not null,
  full_name text not null,
  profile_url text,
  status text not null,
  reason text,
  external_request_id text,
  sent_at timestamptz not null default timezone('utc', now()),
  date_key date not null default (timezone('utc', now())::date)
);

create index if not exists idx_truss_connect_send_logs_user_date
  on public.truss_connect_send_logs (user_id, date_key);

create index if not exists idx_truss_connect_send_logs_user_recipient
  on public.truss_connect_send_logs (user_id, recipient_key);

alter table public.user_page_states enable row level security;
alter table public.truss_connect_accounts enable row level security;
alter table public.truss_connect_send_logs enable row level security;

drop policy if exists "Users can read own page state" on public.user_page_states;
create policy "Users can read own page state"
  on public.user_page_states
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own page state" on public.user_page_states;
create policy "Users can insert own page state"
  on public.user_page_states
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own page state" on public.user_page_states;
create policy "Users can update own page state"
  on public.user_page_states
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own truss accounts" on public.truss_connect_accounts;
create policy "Users can read own truss accounts"
  on public.truss_connect_accounts
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own truss accounts" on public.truss_connect_accounts;
create policy "Users can insert own truss accounts"
  on public.truss_connect_accounts
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own truss accounts" on public.truss_connect_accounts;
create policy "Users can update own truss accounts"
  on public.truss_connect_accounts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own truss send logs" on public.truss_connect_send_logs;
create policy "Users can read own truss send logs"
  on public.truss_connect_send_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own truss send logs" on public.truss_connect_send_logs;
create policy "Users can insert own truss send logs"
  on public.truss_connect_send_logs
  for insert
  with check (auth.uid() = user_id);
