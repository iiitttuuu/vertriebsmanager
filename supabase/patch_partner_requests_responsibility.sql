-- Partner-Requests: direkte Zuständigkeit fuer nicht zugeordnete Formulareinreichungen.
-- Im Supabase SQL Editor ausfuehren, wenn in "Formulareinreichungen" die Uebergabe/Zustaendigkeit fehlt.

create extension if not exists pgcrypto;

create table if not exists public.partner_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_name text not null default '',
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  website text not null default '',
  address text not null default '',
  postal_code text not null default '',
  city text not null default '',
  state text not null default '',
  country text not null default '',
  redemption_method text not null default '',
  message text not null default '',
  status text not null default 'offen',
  linked_provider_id text not null default '',
  responsible_user_id uuid references auth.users(id) on delete set null,
  responsible_name text not null default '',
  responsible_role text not null default '',
  responsibility_source text not null default '',
  responsibility_updated_at timestamptz
);

alter table public.partner_requests
  add column if not exists responsible_user_id uuid references auth.users(id) on delete set null,
  add column if not exists responsible_name text not null default '',
  add column if not exists responsible_role text not null default '',
  add column if not exists responsibility_source text not null default '',
  add column if not exists responsibility_updated_at timestamptz;

alter table public.partner_requests enable row level security;

grant select on table public.partner_requests to authenticated;
grant update (
  status,
  responsible_user_id,
  responsible_name,
  responsible_role,
  responsibility_source,
  responsibility_updated_at
) on table public.partner_requests to authenticated;

drop policy if exists "partner_requests_admin_select" on public.partner_requests;
create policy "partner_requests_admin_select"
on public.partner_requests
for select
to authenticated
using (public.is_admin() or responsible_user_id = auth.uid());

drop policy if exists "partner_requests_admin_update_status" on public.partner_requests;
drop policy if exists "partner_requests_admin_update" on public.partner_requests;
create policy "partner_requests_admin_update"
on public.partner_requests
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "partner_requests_responsible_update_status" on public.partner_requests;
create policy "partner_requests_responsible_update_status"
on public.partner_requests
for update
to authenticated
using (responsible_user_id = auth.uid())
with check (responsible_user_id = auth.uid());

create index if not exists idx_partner_requests_responsible_user_id
on public.partner_requests (responsible_user_id);

create index if not exists idx_partner_requests_linked_provider_id
on public.partner_requests (linked_provider_id);
