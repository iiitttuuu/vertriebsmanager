-- Supabase Schema fuer Vertriebsmanager (MVP: kompletter App-State als JSONB)
-- Im Supabase SQL Editor ausfuehren.

create extension if not exists pgcrypto;

create table if not exists public.app_state (
  id text primary key default 'main',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- Achtung: Diese Policies erlauben Zugriff fuer anon + authenticated.
-- Fuer Produktion spaeter mit Supabase Auth auf 'authenticated' einschraenken.
drop policy if exists "app_state_anon_all" on public.app_state;
create policy "app_state_anon_all"
on public.app_state
for all
to anon
using (true)
with check (true);

drop policy if exists "app_state_auth_all" on public.app_state;
create policy "app_state_auth_all"
on public.app_state
for all
to authenticated
using (true)
with check (true);
