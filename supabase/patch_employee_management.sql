-- Mitarbeiterverwaltung Komplett-Patch
-- Im Supabase SQL Editor ausfuehren.
-- Idempotent: kann mehrfach ausgefuehrt werden.

create extension if not exists pgcrypto;

-- 1) Rollen sauber auf superadmin normalisieren
update public.profiles
set role = 'superadmin'
where role = 'supaadmin';

update public.employee_invites
set role = 'superadmin'
where role = 'supaadmin';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'superadmin', 'mitarbeiter', 'vertriebsmitarbeiter'));

alter table public.employee_invites drop constraint if exists employee_invites_role_check;
alter table public.employee_invites
  add constraint employee_invites_role_check
  check (role in ('admin', 'superadmin', 'mitarbeiter', 'vertriebsmitarbeiter'));

-- 2) UUID/Text-Kompatibilitaet (verhindert "operator does not exist: uuid = text")
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.user_id::text = auth.uid()::text
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
  select coalesce(public.current_user_role() in ('admin', 'superadmin'), false);
$$;

-- 3) Signup-Trigger fuer Profile (ohne legacy supaadmin)
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
    where p.role in ('admin', 'superadmin')
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
    case when assigned_role in ('admin', 'superadmin') then 'active' else 'pending' end
  )
  on conflict (user_id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role = excluded.role,
        phone = excluded.phone,
        address = excluded.address,
        status = case when excluded.role in ('admin', 'superadmin') then 'active' else 'pending' end,
        updated_at = now();

  if invite_row.id is not null then
    update public.employee_invites
    set status = 'accepted',
        accepted_by = new.id,
        updated_at = now()
    where id = invite_row.id;
  end if;

  return new;
end;
$$;

-- 4) RLS fuer app_state: aktive Mitarbeiter duerfen schreiben
alter table public.app_state enable row level security;

drop policy if exists "app_state_auth_read" on public.app_state;
create policy "app_state_auth_read"
on public.app_state
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

drop policy if exists "app_state_admin_insert" on public.app_state;
drop policy if exists "app_state_active_insert" on public.app_state;
create policy "app_state_active_insert"
on public.app_state
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

drop policy if exists "app_state_admin_update" on public.app_state;
drop policy if exists "app_state_active_update" on public.app_state;
create policy "app_state_active_update"
on public.app_state
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

drop policy if exists "app_state_admin_delete" on public.app_state;
create policy "app_state_admin_delete"
on public.app_state
for delete
to authenticated
using (public.is_admin());

-- 5) Hilfreiche Views fuer Mitarbeiterverwaltung
create or replace view public.v_employee_overview as
select
  p.user_id,
  p.email,
  p.full_name,
  p.role,
  p.status,
  p.phone,
  p.address,
  p.created_at,
  p.updated_at
from public.profiles p
order by lower(p.full_name), lower(p.email);

create or replace view public.v_employee_invites_open as
select
  i.id,
  i.email,
  i.full_name,
  i.role,
  i.status,
  i.invited_by,
  i.created_at,
  i.updated_at
from public.employee_invites i
where i.status = 'pending'
order by i.created_at desc;

-- 6) Optional: gewuenschten Superadmin setzen (E-Mail anpassen)
-- update public.profiles
-- set role = 'superadmin', status = 'active', updated_at = now()
-- where lower(email) = 'ch.hasenbichler@gmail.com';
