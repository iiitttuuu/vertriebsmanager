-- Partner-Requests fuer Admin-/Superadmin-Dashboard und Glocke.
-- Legt public.partner_requests bei Bedarf an und ergaenzt neue Formularfelder.

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

do $$
begin
  execute '
    alter table public.partner_requests
      add column if not exists created_at timestamptz not null default now(),
      add column if not exists company_name text not null default '''',
      add column if not exists contact_name text not null default '''',
      add column if not exists email text not null default '''',
      add column if not exists phone text not null default '''',
      add column if not exists website text not null default '''',
      add column if not exists address text not null default '''',
      add column if not exists postal_code text not null default '''',
      add column if not exists city text not null default '''',
      add column if not exists state text not null default '''',
      add column if not exists country text not null default '''',
      add column if not exists redemption_method text not null default '''',
      add column if not exists message text not null default '''',
      add column if not exists status text not null default ''offen'',
      add column if not exists linked_provider_id text not null default '''',
      add column if not exists responsible_user_id uuid references auth.users(id) on delete set null,
      add column if not exists responsible_name text not null default '''',
      add column if not exists responsible_role text not null default '''',
      add column if not exists responsibility_source text not null default '''',
      add column if not exists responsibility_updated_at timestamptz
  ';
  execute 'alter table public.partner_requests enable row level security';
  execute '
    grant select, update (
      status,
      responsible_user_id,
      responsible_name,
      responsible_role,
      responsibility_source,
      responsibility_updated_at
    ) on table public.partner_requests to authenticated
  ';

  execute 'drop policy if exists "partner_requests_admin_select" on public.partner_requests';
  execute '
    create policy "partner_requests_admin_select"
    on public.partner_requests
    for select
    to authenticated
    using (public.is_admin() or responsible_user_id = auth.uid())
  ';
  execute 'drop policy if exists "partner_requests_admin_update_status" on public.partner_requests';
  execute 'drop policy if exists "partner_requests_responsible_update_status" on public.partner_requests';
  execute '
    create policy "partner_requests_admin_update_status"
    on public.partner_requests
    for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin())
  ';
  execute '
    create policy "partner_requests_responsible_update_status"
    on public.partner_requests
    for update
    to authenticated
    using (responsible_user_id = auth.uid())
    with check (responsible_user_id = auth.uid())
  ';

  execute 'create index if not exists idx_partner_requests_responsible_user_id on public.partner_requests (responsible_user_id)';
  execute 'create index if not exists idx_partner_requests_linked_provider_id on public.partner_requests (linked_provider_id)';

  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'partner_requests'
  ) then
    execute 'alter publication supabase_realtime add table public.partner_requests';
  end if;
end;
$$;
