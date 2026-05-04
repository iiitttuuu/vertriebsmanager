-- Harte Duplikat-Sperre fuer Anbieter (provider_registry)
-- Im Supabase SQL Editor ausfuehren.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.provider_registry (
  provider_id text primary key,
  unique_key text not null unique,
  provider_name text not null default '',
  coverage_mode text not null default 'locations',
  country text not null default '',
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_provider_registry_updated_at on public.provider_registry;
create trigger trg_provider_registry_updated_at
before update on public.provider_registry
for each row execute procedure public.set_updated_at();

alter table public.provider_registry enable row level security;

drop policy if exists "provider_registry_auth_select" on public.provider_registry;
create policy "provider_registry_auth_select"
on public.provider_registry
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id::text = auth.uid()::text
      and p.status = 'active'
  )
);

drop policy if exists "provider_registry_auth_insert" on public.provider_registry;
create policy "provider_registry_auth_insert"
on public.provider_registry
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id::text = auth.uid()::text
      and p.status = 'active'
  )
);

drop policy if exists "provider_registry_auth_update" on public.provider_registry;
create policy "provider_registry_auth_update"
on public.provider_registry
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id::text = auth.uid()::text
      and p.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id::text = auth.uid()::text
      and p.status = 'active'
  )
);

drop policy if exists "provider_registry_auth_delete" on public.provider_registry;
create policy "provider_registry_auth_delete"
on public.provider_registry
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id::text = auth.uid()::text
      and p.status = 'active'
  )
);
