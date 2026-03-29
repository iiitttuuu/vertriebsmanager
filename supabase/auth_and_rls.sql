-- Supabase Auth + RLS Setup fuer echte Mitarbeiter-Logins
-- Nach schema.sql im SQL Editor ausfuehren.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role text not null default 'mitarbeiter' check (role in ('admin', 'mitarbeiter')),
  phone text not null default '',
  address text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employee_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  role text not null default 'mitarbeiter' check (role in ('admin', 'mitarbeiter')),
  phone text not null default '',
  address text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_employee_invites_updated_at on public.employee_invites;
create trigger trg_employee_invites_updated_at
before update on public.employee_invites
for each row execute procedure public.set_updated_at();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.user_id = auth.uid()
    and p.status = 'active'
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.employee_invites%rowtype;
  normalized_email text;
  fallback_name text;
  has_admin boolean;
  assigned_role text;
begin
  normalized_email := lower(coalesce(new.email, ''));
  fallback_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(normalized_email, '@', 1),
    'Benutzer'
  );
  select exists(
    select 1
    from public.profiles p
    where p.role = 'admin'
      and p.status = 'active'
  ) into has_admin;

  select *
  into invite_row
  from public.employee_invites
  where lower(email) = normalized_email
    and status = 'pending'
  order by created_at asc
  limit 1;

  if invite_row.id is not null then
    assigned_role := coalesce(invite_row.role, 'mitarbeiter');
  else
    assigned_role := case when has_admin then 'mitarbeiter' else 'admin' end;
  end if;

  if invite_row.id is not null then
    insert into public.profiles (
      user_id, email, full_name, role, phone, address, status
    )
    values (
      new.id,
      normalized_email,
      coalesce(invite_row.full_name, fallback_name),
      assigned_role,
      coalesce(invite_row.phone, ''),
      coalesce(invite_row.address, ''),
      'active'
    )
    on conflict (user_id) do update
      set email = excluded.email,
          full_name = excluded.full_name,
          role = excluded.role,
          phone = excluded.phone,
          address = excluded.address,
          status = 'active',
          updated_at = now();

    update public.employee_invites
    set status = 'accepted',
        accepted_by = new.id,
        updated_at = now()
    where id = invite_row.id;
  else
    insert into public.profiles (
      user_id, email, full_name, role, phone, address, status
    )
    values (
      new.id,
      normalized_email,
      fallback_name,
      assigned_role,
      '',
      '',
      'active'
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.employee_invites enable row level security;
alter table public.app_state enable row level security;

drop policy if exists "app_state_anon_all" on public.app_state;
drop policy if exists "app_state_auth_all" on public.app_state;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "profiles_admin_delete" on public.profiles;
create policy "profiles_admin_delete"
on public.profiles
for delete
to authenticated
using (public.is_admin());

drop policy if exists "employee_invites_admin_select" on public.employee_invites;
create policy "employee_invites_admin_select"
on public.employee_invites
for select
to authenticated
using (public.is_admin());

drop policy if exists "employee_invites_admin_insert" on public.employee_invites;
create policy "employee_invites_admin_insert"
on public.employee_invites
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "employee_invites_admin_update" on public.employee_invites;
create policy "employee_invites_admin_update"
on public.employee_invites
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "employee_invites_admin_delete" on public.employee_invites;
create policy "employee_invites_admin_delete"
on public.employee_invites
for delete
to authenticated
using (public.is_admin());

drop policy if exists "app_state_auth_read" on public.app_state;
create policy "app_state_auth_read"
on public.app_state
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.status = 'active'
  )
);

drop policy if exists "app_state_admin_insert" on public.app_state;
create policy "app_state_admin_insert"
on public.app_state
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "app_state_admin_update" on public.app_state;
create policy "app_state_admin_update"
on public.app_state
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "app_state_admin_delete" on public.app_state;
create policy "app_state_admin_delete"
on public.app_state
for delete
to authenticated
using (public.is_admin());

-- Einmalig ersten Admin setzen (E-Mail anpassen):
-- update public.profiles set role = 'admin' where email = 'deine-admin-mail@firma.at';
