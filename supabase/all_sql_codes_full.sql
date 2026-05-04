-- =============================================================
-- BusinessOS / Vertriebsmanager - Vollständige SQL-Codes
-- Direkt im Supabase SQL Editor ausführbar (blockweise empfohlen)
-- Generiert: 2026-05-03
-- =============================================================


-- -------------------------------------------------------------
-- BEGIN FILE: supabase/schema.sql
-- -------------------------------------------------------------
-- Supabase Basis-Schema fuer Vertriebsmanager
-- Im Supabase SQL Editor ausfuehren (Schritt 1).
-- Danach unbedingt auth_and_rls.sql ausfuehren (Schritt 2).

create extension if not exists pgcrypto;

create table if not exists public.app_state (
  id text primary key default 'main',
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- -------------------------------------------------------------
-- END FILE: supabase/schema.sql
-- -------------------------------------------------------------


-- -------------------------------------------------------------
-- BEGIN FILE: supabase/auth_and_rls.sql
-- -------------------------------------------------------------
-- Supabase Auth + RLS Setup fuer echte Mitarbeiter-Logins
-- Nach schema.sql im SQL Editor ausfuehren.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role text not null default 'mitarbeiter' check (role in ('admin', 'superadmin', 'supaadmin', 'mitarbeiter', 'vertriebsmitarbeiter')),
  phone text not null default '',
  address text not null default '',
  status text not null default 'active' check (status in ('active', 'pending', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

update public.profiles
set role = 'superadmin'
where role = 'supaadmin';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'superadmin', 'supaadmin', 'mitarbeiter', 'vertriebsmitarbeiter'));

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check
  check (status in ('active', 'pending', 'inactive'));

create table if not exists public.employee_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  role text not null default 'mitarbeiter' check (role in ('admin', 'superadmin', 'supaadmin', 'mitarbeiter', 'vertriebsmitarbeiter')),
  phone text not null default '',
  address text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

update public.employee_invites
set role = 'superadmin'
where role = 'supaadmin';

alter table public.employee_invites drop constraint if exists employee_invites_role_check;
alter table public.employee_invites
  add constraint employee_invites_role_check
  check (role in ('admin', 'superadmin', 'supaadmin', 'mitarbeiter', 'vertriebsmitarbeiter'));

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

drop trigger if exists trg_provider_registry_updated_at on public.provider_registry;
create trigger trg_provider_registry_updated_at
before update on public.provider_registry
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
  select coalesce(public.current_user_role() in ('admin', 'superadmin', 'supaadmin'), false);
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
    where p.role in ('admin', 'superadmin', 'supaadmin')
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
    case when assigned_role in ('admin', 'superadmin', 'supaadmin') then 'active' else 'pending' end
  )
  on conflict (user_id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role = excluded.role,
        phone = excluded.phone,
        address = excluded.address,
        status = case when excluded.role in ('admin', 'superadmin', 'supaadmin') then 'active' else 'pending' end,
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.employee_invites enable row level security;
alter table public.provider_registry enable row level security;
alter table public.app_state enable row level security;

drop policy if exists "app_state_anon_all" on public.app_state;
drop policy if exists "app_state_auth_all" on public.app_state;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (user_id::text = auth.uid()::text or public.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (user_id::text = auth.uid()::text);

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles
for update
to authenticated
using (user_id::text = auth.uid()::text or public.is_admin())
with check (user_id::text = auth.uid()::text or public.is_admin());

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

-- Einmalig ersten Admin setzen (E-Mail anpassen):
-- update public.profiles set role = 'superadmin' where email = 'deine-superadmin-mail@firma.at';

-- -------------------------------------------------------------
-- END FILE: supabase/auth_and_rls.sql
-- -------------------------------------------------------------


-- -------------------------------------------------------------
-- BEGIN FILE: supabase/patch_uuid_text_compat.sql
-- -------------------------------------------------------------
-- Fix fuer Fehler: operator does not exist: uuid = text (SQLSTATE 42883)
-- Ausfuehren im Supabase SQL Editor.

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

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (user_id::text = auth.uid()::text or public.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (user_id::text = auth.uid()::text);

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles
for update
to authenticated
using (user_id::text = auth.uid()::text or public.is_admin())
with check (user_id::text = auth.uid()::text or public.is_admin());

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

-- -------------------------------------------------------------
-- END FILE: supabase/patch_uuid_text_compat.sql
-- -------------------------------------------------------------


-- -------------------------------------------------------------
-- BEGIN FILE: supabase/patch_provider_registry.sql
-- -------------------------------------------------------------
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

-- -------------------------------------------------------------
-- END FILE: supabase/patch_provider_registry.sql
-- -------------------------------------------------------------


-- -------------------------------------------------------------
-- BEGIN FILE: supabase/patch_provider_notes.sql
-- -------------------------------------------------------------
-- Provider-Notizen Tabelle + RLS
-- Im Supabase SQL Editor ausfuehren.
-- Idempotent: kann mehrfach ausgefuehrt werden.

create extension if not exists pgcrypto;

create table if not exists public.provider_notes (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  note_text text not null default '',
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_by_name text not null default '',
  created_by_role text not null default 'mitarbeiter',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_provider_notes_provider_id
  on public.provider_notes (provider_id);

create index if not exists idx_provider_notes_created_by_user_id
  on public.provider_notes (created_by_user_id);

create index if not exists idx_provider_notes_provider_created_at
  on public.provider_notes (provider_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_provider_notes_updated_at on public.provider_notes;
create trigger trg_provider_notes_updated_at
before update on public.provider_notes
for each row execute procedure public.set_updated_at();

alter table public.provider_notes enable row level security;

-- Nur aktive Accounts duerfen arbeiten
drop policy if exists "provider_notes_active_select" on public.provider_notes;
create policy "provider_notes_active_select"
on public.provider_notes
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

-- Insert nur fuer eigene User-ID
drop policy if exists "provider_notes_active_insert_own" on public.provider_notes;
create policy "provider_notes_active_insert_own"
on public.provider_notes
for insert
to authenticated
with check (
  created_by_user_id::text = auth.uid()::text
  and exists (
    select 1
    from public.profiles p
    where p.user_id::text = auth.uid()::text
      and p.status = 'active'
  )
);

-- Update/Delete nur fuer eigene Notizen
drop policy if exists "provider_notes_active_update_own" on public.provider_notes;
create policy "provider_notes_active_update_own"
on public.provider_notes
for update
to authenticated
using (
  created_by_user_id::text = auth.uid()::text
  and exists (
    select 1
    from public.profiles p
    where p.user_id::text = auth.uid()::text
      and p.status = 'active'
  )
)
with check (
  created_by_user_id::text = auth.uid()::text
  and exists (
    select 1
    from public.profiles p
    where p.user_id::text = auth.uid()::text
      and p.status = 'active'
  )
);

drop policy if exists "provider_notes_active_delete_own" on public.provider_notes;
create policy "provider_notes_active_delete_own"
on public.provider_notes
for delete
to authenticated
using (
  created_by_user_id::text = auth.uid()::text
  and exists (
    select 1
    from public.profiles p
    where p.user_id::text = auth.uid()::text
      and p.status = 'active'
  )
);

-- -------------------------------------------------------------
-- END FILE: supabase/patch_provider_notes.sql
-- -------------------------------------------------------------


-- -------------------------------------------------------------
-- BEGIN FILE: supabase/patch_provider_notes_role_constraint.sql
-- -------------------------------------------------------------
-- Fix fuer provider_notes.created_by_role Check-Constraint
-- Fehlerbild: Code 23514 / provider_notes_created_by_role_check
-- Im Supabase SQL Editor ausfuehren.

-- 1) Legacy-/Tippfehler-Werte normalisieren
update public.provider_notes
set created_by_role = 'superadmin'
where lower(coalesce(created_by_role, '')) = 'supaadmin';

update public.provider_notes
set created_by_role = 'mitarbeiter'
where lower(coalesce(created_by_role, '')) not in ('mitarbeiter', 'vertriebsmitarbeiter', 'admin', 'superadmin');

-- 2) Constraint neu setzen (Superadmin erlauben)
alter table public.provider_notes
  drop constraint if exists provider_notes_created_by_role_check;

alter table public.provider_notes
  add constraint provider_notes_created_by_role_check
  check (created_by_role in ('mitarbeiter', 'vertriebsmitarbeiter', 'admin', 'superadmin'));

-- -------------------------------------------------------------
-- END FILE: supabase/patch_provider_notes_role_constraint.sql
-- -------------------------------------------------------------


-- -------------------------------------------------------------
-- BEGIN FILE: supabase/patch_sales_phone_acquisition.sql
-- -------------------------------------------------------------
-- Telefonakquise: Calls + Notizen + Aufgaben
-- Im Supabase SQL Editor ausführen.
-- Idempotent: kann mehrfach ausgeführt werden.

create extension if not exists pgcrypto;

create table if not exists public.sales_phone_calls (
  id text primary key,
  provider_id text not null,
  provider_name text not null default '',
  provider_phone text not null default '',
  assignee_user_id uuid references auth.users(id) on delete set null,
  assignee_name text not null default '',
  planned_date date,
  plan_slot text not null default 'vormittag'
    check (plan_slot in ('vormittag', 'mittag', 'nachmittag', 'abend')),
  status text not null default 'neu'
    check (
      status in (
        'neu',
        'nicht_erreicht',
        'mailbox',
        'rueckruf',
        'erreicht',
        'kein_interesse',
        'interessiert',
        'angebot_gesendet',
        'termin_vereinbart',
        'abschluss'
      )
    ),
  reminder_at timestamptz,
  last_contact_at timestamptz,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_by_role text not null default 'mitarbeiter',
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_name text not null default '',
  updated_by_role text not null default 'mitarbeiter'
);

create table if not exists public.sales_phone_notes (
  id text primary key,
  call_id text not null references public.sales_phone_calls(id) on delete cascade,
  note_text text not null default '',
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_by_role text not null default 'mitarbeiter'
);

create table if not exists public.sales_phone_tasks (
  id text primary key,
  call_id text not null references public.sales_phone_calls(id) on delete cascade,
  title text not null default '',
  assignee_user_id uuid references auth.users(id) on delete set null,
  assignee_name text not null default '',
  due_date date,
  status text not null default 'offen' check (status in ('offen', 'erledigt')),
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_by_role text not null default 'mitarbeiter',
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_name text not null default '',
  updated_by_role text not null default 'mitarbeiter'
);

create index if not exists idx_sales_phone_calls_assignee_user_id
  on public.sales_phone_calls (assignee_user_id);

create index if not exists idx_sales_phone_calls_status_planned_date
  on public.sales_phone_calls (status, planned_date);

create index if not exists idx_sales_phone_calls_reminder_at
  on public.sales_phone_calls (reminder_at);

create index if not exists idx_sales_phone_notes_call_id
  on public.sales_phone_notes (call_id);

create index if not exists idx_sales_phone_tasks_call_id
  on public.sales_phone_tasks (call_id);

create index if not exists idx_sales_phone_tasks_assignee_status_due
  on public.sales_phone_tasks (assignee_user_id, status, due_date);

create or replace function public.sales_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('superadmin', 'admin')
  );
$$;

create or replace function public.sales_phone_call_visible(call_row public.sales_phone_calls)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.sales_user_is_admin()
    or call_row.assignee_user_id = auth.uid()
    or call_row.created_by_user_id = auth.uid(),
    false
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sales_phone_calls_updated_at on public.sales_phone_calls;
create trigger trg_sales_phone_calls_updated_at
before update on public.sales_phone_calls
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_sales_phone_tasks_updated_at on public.sales_phone_tasks;
create trigger trg_sales_phone_tasks_updated_at
before update on public.sales_phone_tasks
for each row execute procedure public.set_updated_at();

alter table public.sales_phone_calls enable row level security;
alter table public.sales_phone_notes enable row level security;
alter table public.sales_phone_tasks enable row level security;

drop policy if exists "sales_phone_calls_select" on public.sales_phone_calls;
create policy "sales_phone_calls_select"
on public.sales_phone_calls
for select
to authenticated
using (public.sales_phone_call_visible(sales_phone_calls));

drop policy if exists "sales_phone_calls_insert" on public.sales_phone_calls;
create policy "sales_phone_calls_insert"
on public.sales_phone_calls
for insert
to authenticated
with check (
  public.sales_user_is_admin()
  or assignee_user_id = auth.uid()
  or created_by_user_id = auth.uid()
);

drop policy if exists "sales_phone_calls_update" on public.sales_phone_calls;
create policy "sales_phone_calls_update"
on public.sales_phone_calls
for update
to authenticated
using (public.sales_phone_call_visible(sales_phone_calls))
with check (
  public.sales_user_is_admin()
  or assignee_user_id = auth.uid()
  or created_by_user_id = auth.uid()
);

drop policy if exists "sales_phone_calls_delete" on public.sales_phone_calls;
create policy "sales_phone_calls_delete"
on public.sales_phone_calls
for delete
to authenticated
using (public.sales_phone_call_visible(sales_phone_calls));

drop policy if exists "sales_phone_notes_select" on public.sales_phone_notes;
create policy "sales_phone_notes_select"
on public.sales_phone_notes
for select
to authenticated
using (
  exists (
    select 1
    from public.sales_phone_calls c
    where c.id = sales_phone_notes.call_id
      and public.sales_phone_call_visible(c)
  )
);

drop policy if exists "sales_phone_notes_insert" on public.sales_phone_notes;
create policy "sales_phone_notes_insert"
on public.sales_phone_notes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.sales_phone_calls c
    where c.id = sales_phone_notes.call_id
      and public.sales_phone_call_visible(c)
  )
);

drop policy if exists "sales_phone_notes_delete" on public.sales_phone_notes;
create policy "sales_phone_notes_delete"
on public.sales_phone_notes
for delete
to authenticated
using (
  exists (
    select 1
    from public.sales_phone_calls c
    where c.id = sales_phone_notes.call_id
      and public.sales_phone_call_visible(c)
  )
);

drop policy if exists "sales_phone_tasks_select" on public.sales_phone_tasks;
create policy "sales_phone_tasks_select"
on public.sales_phone_tasks
for select
to authenticated
using (
  exists (
    select 1
    from public.sales_phone_calls c
    where c.id = sales_phone_tasks.call_id
      and public.sales_phone_call_visible(c)
  )
);

drop policy if exists "sales_phone_tasks_insert" on public.sales_phone_tasks;
create policy "sales_phone_tasks_insert"
on public.sales_phone_tasks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.sales_phone_calls c
    where c.id = sales_phone_tasks.call_id
      and public.sales_phone_call_visible(c)
  )
);

drop policy if exists "sales_phone_tasks_update" on public.sales_phone_tasks;
create policy "sales_phone_tasks_update"
on public.sales_phone_tasks
for update
to authenticated
using (
  exists (
    select 1
    from public.sales_phone_calls c
    where c.id = sales_phone_tasks.call_id
      and public.sales_phone_call_visible(c)
  )
)
with check (
  exists (
    select 1
    from public.sales_phone_calls c
    where c.id = sales_phone_tasks.call_id
      and public.sales_phone_call_visible(c)
  )
);

drop policy if exists "sales_phone_tasks_delete" on public.sales_phone_tasks;
create policy "sales_phone_tasks_delete"
on public.sales_phone_tasks
for delete
to authenticated
using (
  exists (
    select 1
    from public.sales_phone_calls c
    where c.id = sales_phone_tasks.call_id
      and public.sales_phone_call_visible(c)
  )
);

-- -------------------------------------------------------------
-- END FILE: supabase/patch_sales_phone_acquisition.sql
-- -------------------------------------------------------------


-- -------------------------------------------------------------
-- BEGIN FILE: supabase/patch_app_state_active_write.sql
-- -------------------------------------------------------------
-- Mitarbeiter duerfen App-Status global speichern (aktive Accounts).
-- Im Supabase SQL Editor ausfuehren.

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

-- -------------------------------------------------------------
-- END FILE: supabase/patch_app_state_active_write.sql
-- -------------------------------------------------------------


-- -------------------------------------------------------------
-- BEGIN FILE: supabase/patch_conversation_notes.sql
-- -------------------------------------------------------------
-- Gesprächsnotizen + Aufgaben (relational) für Supabase
-- Im Supabase SQL Editor ausführen.
-- Idempotent: kann mehrfach ausgeführt werden.

create extension if not exists pgcrypto;

create table if not exists public.conversation_threads (
  id text primary key,
  title text not null default '',
  contact_name text not null default '',
  contact_type text not null default 'extern' check (contact_type in ('intern', 'extern')),
  organization_id text,
  organization text not null default '',
  channel text not null default 'meeting' check (channel in ('meeting', 'telefon', 'email', 'whatsapp', 'sonstiges')),
  conversation_date date,
  internal_participant_user_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_by_role text not null default 'mitarbeiter',
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_name text not null default '',
  updated_by_role text not null default 'mitarbeiter'
);

create table if not exists public.conversation_organizations (
  id text primary key,
  name text not null,
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  website text not null default '',
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_by_role text not null default 'mitarbeiter',
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_name text not null default '',
  updated_by_role text not null default 'mitarbeiter'
);

create table if not exists public.conversation_tasks (
  id text primary key,
  thread_id text not null references public.conversation_threads(id) on delete cascade,
  title text not null default '',
  assignee_user_id uuid references auth.users(id) on delete set null,
  assignee_name text not null default '',
  due_date date,
  priority text not null default 'mittel' check (priority in ('niedrig', 'mittel', 'hoch')),
  status text not null default 'offen' check (status in ('offen', 'in_arbeit', 'warten', 'erledigt')),
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_by_role text not null default 'mitarbeiter',
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_name text not null default '',
  updated_by_role text not null default 'mitarbeiter'
);

create table if not exists public.conversation_notes (
  id text primary key,
  thread_id text not null references public.conversation_threads(id) on delete cascade,
  note_text text not null default '',
  linked_task_id text,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_by_role text not null default 'mitarbeiter',
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_name text not null default '',
  updated_by_role text not null default 'mitarbeiter'
);

alter table public.conversation_threads
  add column if not exists organization_id text;

alter table public.conversation_threads
  add column if not exists internal_participant_user_ids text[] not null default '{}';

alter table public.conversation_threads
  drop constraint if exists conversation_threads_organization_id_fkey;

alter table public.conversation_threads
  add constraint conversation_threads_organization_id_fkey
  foreign key (organization_id) references public.conversation_organizations(id) on delete set null;

create index if not exists idx_conversation_threads_updated_at
  on public.conversation_threads (updated_at desc);

create index if not exists idx_conversation_threads_organization_id
  on public.conversation_threads (organization_id);

create index if not exists idx_conversation_tasks_thread_id
  on public.conversation_tasks (thread_id);

create index if not exists idx_conversation_tasks_assignee_user_id
  on public.conversation_tasks (assignee_user_id);

create index if not exists idx_conversation_tasks_status_due_date
  on public.conversation_tasks (status, due_date);

create index if not exists idx_conversation_notes_thread_id
  on public.conversation_notes (thread_id);

create index if not exists idx_conversation_notes_created_at
  on public.conversation_notes (created_at desc);

create index if not exists idx_conversation_organizations_name
  on public.conversation_organizations (lower(name));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_conversation_threads_updated_at on public.conversation_threads;
create trigger trg_conversation_threads_updated_at
before update on public.conversation_threads
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_conversation_tasks_updated_at on public.conversation_tasks;
create trigger trg_conversation_tasks_updated_at
before update on public.conversation_tasks
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_conversation_notes_updated_at on public.conversation_notes;
create trigger trg_conversation_notes_updated_at
before update on public.conversation_notes
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_conversation_organizations_updated_at on public.conversation_organizations;
create trigger trg_conversation_organizations_updated_at
before update on public.conversation_organizations
for each row execute procedure public.set_updated_at();

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'superadmin', false);
$$;

alter table public.conversation_threads enable row level security;
alter table public.conversation_tasks enable row level security;
alter table public.conversation_notes enable row level security;
alter table public.conversation_organizations enable row level security;

-- Threads: ausschließlich Superadmin

drop policy if exists "conversation_threads_superadmin_select" on public.conversation_threads;
create policy "conversation_threads_superadmin_select"
on public.conversation_threads
for select
to authenticated
using (public.is_superadmin());

drop policy if exists "conversation_threads_superadmin_insert" on public.conversation_threads;
create policy "conversation_threads_superadmin_insert"
on public.conversation_threads
for insert
to authenticated
with check (public.is_superadmin());

drop policy if exists "conversation_threads_superadmin_update" on public.conversation_threads;
create policy "conversation_threads_superadmin_update"
on public.conversation_threads
for update
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "conversation_threads_superadmin_delete" on public.conversation_threads;
create policy "conversation_threads_superadmin_delete"
on public.conversation_threads
for delete
to authenticated
using (public.is_superadmin());

-- Organizationen: ausschließlich Superadmin

drop policy if exists "conversation_organizations_superadmin_select" on public.conversation_organizations;
create policy "conversation_organizations_superadmin_select"
on public.conversation_organizations
for select
to authenticated
using (public.is_superadmin());

drop policy if exists "conversation_organizations_superadmin_insert" on public.conversation_organizations;
create policy "conversation_organizations_superadmin_insert"
on public.conversation_organizations
for insert
to authenticated
with check (public.is_superadmin());

drop policy if exists "conversation_organizations_superadmin_update" on public.conversation_organizations;
create policy "conversation_organizations_superadmin_update"
on public.conversation_organizations
for update
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "conversation_organizations_superadmin_delete" on public.conversation_organizations;
create policy "conversation_organizations_superadmin_delete"
on public.conversation_organizations
for delete
to authenticated
using (public.is_superadmin());

-- Notes: ausschließlich Superadmin

drop policy if exists "conversation_notes_superadmin_select" on public.conversation_notes;
create policy "conversation_notes_superadmin_select"
on public.conversation_notes
for select
to authenticated
using (public.is_superadmin());

drop policy if exists "conversation_notes_superadmin_insert" on public.conversation_notes;
create policy "conversation_notes_superadmin_insert"
on public.conversation_notes
for insert
to authenticated
with check (public.is_superadmin());

drop policy if exists "conversation_notes_superadmin_update" on public.conversation_notes;
create policy "conversation_notes_superadmin_update"
on public.conversation_notes
for update
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "conversation_notes_superadmin_delete" on public.conversation_notes;
create policy "conversation_notes_superadmin_delete"
on public.conversation_notes
for delete
to authenticated
using (public.is_superadmin());

-- Tasks: Superadmin voll; zusätzlich darf ein aktiver Assignee lesen

drop policy if exists "conversation_tasks_superadmin_or_assignee_select" on public.conversation_tasks;
create policy "conversation_tasks_superadmin_or_assignee_select"
on public.conversation_tasks
for select
to authenticated
using (
  public.is_superadmin()
  or (
    assignee_user_id::text = auth.uid()::text
    and exists (
      select 1
      from public.profiles p
      where p.user_id::text = auth.uid()::text
        and p.status = 'active'
    )
  )
);

drop policy if exists "conversation_tasks_superadmin_insert" on public.conversation_tasks;
create policy "conversation_tasks_superadmin_insert"
on public.conversation_tasks
for insert
to authenticated
with check (public.is_superadmin());

drop policy if exists "conversation_tasks_superadmin_update" on public.conversation_tasks;
create policy "conversation_tasks_superadmin_update"
on public.conversation_tasks
for update
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "conversation_tasks_superadmin_delete" on public.conversation_tasks;
create policy "conversation_tasks_superadmin_delete"
on public.conversation_tasks
for delete
to authenticated
using (public.is_superadmin());

-- Backfill Organizationen aus app_state.payload.settings.conversationOrganizations

with source as (
  select coalesce(payload -> 'settings' -> 'conversationOrganizations', '[]'::jsonb) as organizations_json
  from public.app_state
  where id = 'main'
),
organization_rows as (
  select
    coalesce(nullif(org_obj ->> 'id', ''), gen_random_uuid()::text) as id,
    coalesce(org_obj ->> 'name', '') as name,
    coalesce(org_obj ->> 'contactName', '') as contact_name,
    coalesce(org_obj ->> 'email', '') as email,
    coalesce(org_obj ->> 'phone', '') as phone,
    coalesce(org_obj ->> 'website', '') as website,
    case
      when coalesce(org_obj ->> 'createdAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (org_obj ->> 'createdAt')::timestamptz
      else now()
    end as created_at
  from source,
  lateral jsonb_array_elements(source.organizations_json) as org_obj
)
insert into public.conversation_organizations (
  id,
  name,
  contact_name,
  email,
  phone,
  website,
  created_at
)
select
  id,
  name,
  contact_name,
  email,
  phone,
  website,
  created_at
from organization_rows
where name <> ''
on conflict (id) do update
  set name = excluded.name,
      contact_name = excluded.contact_name,
      email = excluded.email,
      phone = excluded.phone,
      website = excluded.website,
      created_at = excluded.created_at;

-- Backfill aus app_state.payload.settings.conversationThreads
-- Läuft idempotent (upsert).

with source as (
  select coalesce(payload -> 'settings' -> 'conversationThreads', '[]'::jsonb) as threads_json
  from public.app_state
  where id = 'main'
),
thread_rows as (
  select
    coalesce(nullif(thread_obj ->> 'id', ''), gen_random_uuid()::text) as id,
    coalesce(thread_obj ->> 'title', '') as title,
    coalesce(thread_obj ->> 'contactName', '') as contact_name,
    case
      when lower(coalesce(thread_obj ->> 'contactType', 'extern')) in ('intern', 'extern') then lower(thread_obj ->> 'contactType')
      else 'extern'
    end as contact_type,
    case
      when exists (
        select 1
        from public.conversation_organizations o
        where o.id = nullif(coalesce(thread_obj ->> 'organizationId', ''), '')
      ) then nullif(coalesce(thread_obj ->> 'organizationId', ''), '')
      else null
    end as organization_id,
    coalesce(thread_obj ->> 'organization', '') as organization,
    case
      when lower(coalesce(thread_obj ->> 'channel', 'meeting')) in ('meeting', 'telefon', 'email', 'whatsapp', 'sonstiges')
        then lower(thread_obj ->> 'channel')
      else 'meeting'
    end as channel,
    case
      when coalesce(thread_obj ->> 'conversationDate', '') ~ '^\d{4}-\d{2}-\d{2}$' then (thread_obj ->> 'conversationDate')::date
      else null
    end as conversation_date,
    coalesce(
      array(
        select jsonb_array_elements_text(coalesce(thread_obj -> 'internalParticipantUserIds', '[]'::jsonb))
      ),
      '{}'
    )::text[] as internal_participant_user_ids,
    case
      when coalesce(thread_obj ->> 'createdAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (thread_obj ->> 'createdAt')::timestamptz
      else now()
    end as created_at,
    case
      when coalesce(thread_obj ->> 'createdByUserId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (thread_obj ->> 'createdByUserId')::uuid
      else null
    end as created_by_user_id,
    coalesce(thread_obj ->> 'createdByName', '') as created_by_name,
    coalesce(thread_obj ->> 'createdByRole', 'mitarbeiter') as created_by_role,
    case
      when coalesce(thread_obj ->> 'updatedAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (thread_obj ->> 'updatedAt')::timestamptz
      else now()
    end as updated_at,
    case
      when coalesce(thread_obj ->> 'updatedByUserId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (thread_obj ->> 'updatedByUserId')::uuid
      else null
    end as updated_by_user_id,
    coalesce(thread_obj ->> 'updatedByName', '') as updated_by_name,
    coalesce(thread_obj ->> 'updatedByRole', 'mitarbeiter') as updated_by_role,
    thread_obj
  from source,
  lateral jsonb_array_elements(source.threads_json) as thread_obj
),
thread_upsert as (
  insert into public.conversation_threads (
    id,
    title,
    contact_name,
    contact_type,
    organization_id,
    organization,
    channel,
    conversation_date,
    internal_participant_user_ids,
    created_at,
    created_by_user_id,
    created_by_name,
    created_by_role,
    updated_at,
    updated_by_user_id,
    updated_by_name,
    updated_by_role
  )
  select
    id,
    title,
    contact_name,
    contact_type,
    organization_id,
    organization,
    channel,
    conversation_date,
    internal_participant_user_ids,
    created_at,
    created_by_user_id,
    created_by_name,
    created_by_role,
    updated_at,
    updated_by_user_id,
    updated_by_name,
    updated_by_role
  from thread_rows
  on conflict (id) do update
    set title = excluded.title,
        contact_name = excluded.contact_name,
        contact_type = excluded.contact_type,
        organization_id = excluded.organization_id,
        organization = excluded.organization,
        channel = excluded.channel,
        conversation_date = excluded.conversation_date,
        internal_participant_user_ids = excluded.internal_participant_user_ids,
        created_at = excluded.created_at,
        created_by_user_id = excluded.created_by_user_id,
        created_by_name = excluded.created_by_name,
        created_by_role = excluded.created_by_role,
        updated_at = excluded.updated_at,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_by_name = excluded.updated_by_name,
        updated_by_role = excluded.updated_by_role
  returning id
),
thread_org_link as (
  update public.conversation_threads t
  set organization_id = o.id
  from public.conversation_organizations o
  where t.id in (select id from thread_upsert)
    and coalesce(t.organization_id, '') = ''
    and coalesce(t.organization, '') <> ''
    and lower(o.name) = lower(t.organization)
  returning t.id
),
task_rows as (
  select
    coalesce(nullif(task_obj ->> 'id', ''), gen_random_uuid()::text) as id,
    tr.id as thread_id,
    coalesce(task_obj ->> 'title', '') as title,
    case
      when coalesce(task_obj ->> 'assigneeUserId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (task_obj ->> 'assigneeUserId')::uuid
      else null
    end as assignee_user_id,
    coalesce(task_obj ->> 'assigneeName', '') as assignee_name,
    case
      when coalesce(task_obj ->> 'dueDate', '') ~ '^\d{4}-\d{2}-\d{2}$' then (task_obj ->> 'dueDate')::date
      else null
    end as due_date,
    case
      when lower(coalesce(task_obj ->> 'priority', 'mittel')) in ('niedrig', 'mittel', 'hoch') then lower(task_obj ->> 'priority')
      else 'mittel'
    end as priority,
    case
      when lower(coalesce(task_obj ->> 'status', 'offen')) in ('offen', 'in_arbeit', 'warten', 'erledigt') then lower(task_obj ->> 'status')
      else 'offen'
    end as status,
    case
      when coalesce(task_obj ->> 'createdAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (task_obj ->> 'createdAt')::timestamptz
      else now()
    end as created_at,
    case
      when coalesce(task_obj ->> 'createdByUserId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (task_obj ->> 'createdByUserId')::uuid
      else null
    end as created_by_user_id,
    coalesce(task_obj ->> 'createdByName', '') as created_by_name,
    coalesce(task_obj ->> 'createdByRole', 'mitarbeiter') as created_by_role,
    case
      when coalesce(task_obj ->> 'updatedAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (task_obj ->> 'updatedAt')::timestamptz
      else now()
    end as updated_at,
    case
      when coalesce(task_obj ->> 'updatedByUserId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (task_obj ->> 'updatedByUserId')::uuid
      else null
    end as updated_by_user_id,
    coalesce(task_obj ->> 'updatedByName', '') as updated_by_name,
    coalesce(task_obj ->> 'updatedByRole', 'mitarbeiter') as updated_by_role
  from thread_rows tr,
  lateral jsonb_array_elements(coalesce(tr.thread_obj -> 'tasks', '[]'::jsonb)) as task_obj
),
notes_rows as (
  select
    coalesce(nullif(note_obj ->> 'id', ''), gen_random_uuid()::text) as id,
    tr.id as thread_id,
    coalesce(note_obj ->> 'text', '') as note_text,
    nullif(note_obj ->> 'linkedTaskId', '') as linked_task_id,
    case
      when coalesce(note_obj ->> 'createdAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (note_obj ->> 'createdAt')::timestamptz
      else now()
    end as created_at,
    case
      when coalesce(note_obj ->> 'createdByUserId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (note_obj ->> 'createdByUserId')::uuid
      else null
    end as created_by_user_id,
    coalesce(note_obj ->> 'createdByName', '') as created_by_name,
    coalesce(note_obj ->> 'createdByRole', 'mitarbeiter') as created_by_role,
    case
      when coalesce(note_obj ->> 'updatedAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (note_obj ->> 'updatedAt')::timestamptz
      else now()
    end as updated_at,
    case
      when coalesce(note_obj ->> 'updatedByUserId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (note_obj ->> 'updatedByUserId')::uuid
      else null
    end as updated_by_user_id,
    coalesce(note_obj ->> 'updatedByName', '') as updated_by_name,
    coalesce(note_obj ->> 'updatedByRole', 'mitarbeiter') as updated_by_role
  from thread_rows tr,
  lateral jsonb_array_elements(coalesce(tr.thread_obj -> 'notes', '[]'::jsonb)) as note_obj
)
insert into public.conversation_tasks (
  id,
  thread_id,
  title,
  assignee_user_id,
  assignee_name,
  due_date,
  priority,
  status,
  created_at,
  created_by_user_id,
  created_by_name,
  created_by_role,
  updated_at,
  updated_by_user_id,
  updated_by_name,
  updated_by_role
)
select
  id,
  thread_id,
  title,
  assignee_user_id,
  assignee_name,
  due_date,
  priority,
  status,
  created_at,
  created_by_user_id,
  created_by_name,
  created_by_role,
  updated_at,
  updated_by_user_id,
  updated_by_name,
  updated_by_role
from task_rows
where thread_id in (select id from thread_upsert)
on conflict (id) do update
  set thread_id = excluded.thread_id,
      title = excluded.title,
      assignee_user_id = excluded.assignee_user_id,
      assignee_name = excluded.assignee_name,
      due_date = excluded.due_date,
      priority = excluded.priority,
      status = excluded.status,
      created_at = excluded.created_at,
      created_by_user_id = excluded.created_by_user_id,
      created_by_name = excluded.created_by_name,
      created_by_role = excluded.created_by_role,
      updated_at = excluded.updated_at,
      updated_by_user_id = excluded.updated_by_user_id,
      updated_by_name = excluded.updated_by_name,
      updated_by_role = excluded.updated_by_role;

with source as (
  select coalesce(payload -> 'settings' -> 'conversationThreads', '[]'::jsonb) as threads_json
  from public.app_state
  where id = 'main'
),
thread_rows as (
  select
    coalesce(nullif(thread_obj ->> 'id', ''), gen_random_uuid()::text) as id,
    thread_obj
  from source,
  lateral jsonb_array_elements(source.threads_json) as thread_obj
),
notes_rows as (
  select
    coalesce(nullif(note_obj ->> 'id', ''), gen_random_uuid()::text) as id,
    tr.id as thread_id,
    coalesce(note_obj ->> 'text', '') as note_text,
    nullif(note_obj ->> 'linkedTaskId', '') as linked_task_id,
    case
      when coalesce(note_obj ->> 'createdAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (note_obj ->> 'createdAt')::timestamptz
      else now()
    end as created_at,
    case
      when coalesce(note_obj ->> 'createdByUserId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (note_obj ->> 'createdByUserId')::uuid
      else null
    end as created_by_user_id,
    coalesce(note_obj ->> 'createdByName', '') as created_by_name,
    coalesce(note_obj ->> 'createdByRole', 'mitarbeiter') as created_by_role,
    case
      when coalesce(note_obj ->> 'updatedAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (note_obj ->> 'updatedAt')::timestamptz
      else now()
    end as updated_at,
    case
      when coalesce(note_obj ->> 'updatedByUserId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (note_obj ->> 'updatedByUserId')::uuid
      else null
    end as updated_by_user_id,
    coalesce(note_obj ->> 'updatedByName', '') as updated_by_name,
    coalesce(note_obj ->> 'updatedByRole', 'mitarbeiter') as updated_by_role
  from thread_rows tr,
  lateral jsonb_array_elements(coalesce(tr.thread_obj -> 'notes', '[]'::jsonb)) as note_obj
)
insert into public.conversation_notes (
  id,
  thread_id,
  note_text,
  linked_task_id,
  created_at,
  created_by_user_id,
  created_by_name,
  created_by_role,
  updated_at,
  updated_by_user_id,
  updated_by_name,
  updated_by_role
)
select
  id,
  thread_id,
  note_text,
  linked_task_id,
  created_at,
  created_by_user_id,
  created_by_name,
  created_by_role,
  updated_at,
  updated_by_user_id,
  updated_by_name,
  updated_by_role
from notes_rows
on conflict (id) do update
  set thread_id = excluded.thread_id,
      note_text = excluded.note_text,
      linked_task_id = excluded.linked_task_id,
      created_at = excluded.created_at,
      created_by_user_id = excluded.created_by_user_id,
      created_by_name = excluded.created_by_name,
      created_by_role = excluded.created_by_role,
      updated_at = excluded.updated_at,
      updated_by_user_id = excluded.updated_by_user_id,
      updated_by_name = excluded.updated_by_name,
      updated_by_role = excluded.updated_by_role;

-- -------------------------------------------------------------
-- END FILE: supabase/patch_conversation_notes.sql
-- -------------------------------------------------------------


-- -------------------------------------------------------------
-- BEGIN FILE: supabase/patch_employee_management.sql
-- -------------------------------------------------------------
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

-- -------------------------------------------------------------
-- END FILE: supabase/patch_employee_management.sql
-- -------------------------------------------------------------


-- -------------------------------------------------------------
-- BEGIN FILE: supabase/patch_firms_extended_fields.sql
-- -------------------------------------------------------------
-- Erweiterte Firmenfelder:
-- - Adresse: street, postal_code, city, country
-- - Mehrere Ansprechpartner: contacts_json (jsonb)
-- Idempotent.

alter table public.conversation_organizations
  add column if not exists street text not null default '',
  add column if not exists postal_code text not null default '',
  add column if not exists city text not null default '',
  add column if not exists country text not null default '',
  add column if not exists contacts_json jsonb not null default '[]'::jsonb;

-- -------------------------------------------------------------
-- END FILE: supabase/patch_firms_extended_fields.sql
-- -------------------------------------------------------------


-- -------------------------------------------------------------
-- BEGIN FILE: supabase/patch_firms_admin_access.sql
-- -------------------------------------------------------------
-- Firmen-Seite für Admin + Superadmin:
-- - Firmen (conversation_organizations) lesen/anlegen/bearbeiten
-- - Verknüpfte Gesprächsdaten nur lesen (threads/notes/tasks)
-- Gesprächs-CRUD bleibt Superadmin.

-- Threads lesen (Admin + Superadmin)
drop policy if exists "conversation_threads_admin_select" on public.conversation_threads;
create policy "conversation_threads_admin_select"
on public.conversation_threads
for select
to authenticated
using (public.is_admin());

-- Notizen lesen (Admin + Superadmin)
drop policy if exists "conversation_notes_admin_select" on public.conversation_notes;
create policy "conversation_notes_admin_select"
on public.conversation_notes
for select
to authenticated
using (public.is_admin());

-- Aufgaben lesen (Admin + Superadmin zusätzlich zum Assignee-Read)
drop policy if exists "conversation_tasks_admin_select" on public.conversation_tasks;
create policy "conversation_tasks_admin_select"
on public.conversation_tasks
for select
to authenticated
using (public.is_admin());

-- Firmen lesen
drop policy if exists "conversation_organizations_admin_select" on public.conversation_organizations;
create policy "conversation_organizations_admin_select"
on public.conversation_organizations
for select
to authenticated
using (public.is_admin());

-- Firmen anlegen
drop policy if exists "conversation_organizations_admin_insert" on public.conversation_organizations;
create policy "conversation_organizations_admin_insert"
on public.conversation_organizations
for insert
to authenticated
with check (public.is_admin());

-- Firmen bearbeiten
drop policy if exists "conversation_organizations_admin_update" on public.conversation_organizations;
create policy "conversation_organizations_admin_update"
on public.conversation_organizations
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- -------------------------------------------------------------
-- END FILE: supabase/patch_firms_admin_access.sql
-- -------------------------------------------------------------


-- -------------------------------------------------------------
-- BEGIN FILE: supabase/patch_incoming_invoices.sql
-- -------------------------------------------------------------
-- Eingangsrechnungen: Schema + RLS + Basis-Audit
-- Ziel: Freigabe-offene und bereits bezahlte Rechnungen zentral verwalten
-- Hinweis: Dateiinhalte liegen auf NAS, in der DB wird nur Metadaten + NAS-Pfad gespeichert.

create extension if not exists pgcrypto;

create table if not exists public.incoming_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null default '',
  supplier_company_id text not null default '',
  supplier_name text not null default '',
  supplier_vat_id text not null default '',
  supplier_iban text not null default '',
  invoice_date date not null,
  due_date date,
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  total_net numeric(14,2) not null default 0 check (total_net >= 0),
  total_tax numeric(14,2) not null default 0 check (total_tax >= 0),
  total_gross numeric(14,2) not null default 0 check (total_gross >= 0),
  category text not null default 'Sonstiges',
  cost_center text not null default '',
  project_code text not null default '',
  approval_status text not null default 'freigabe_offen'
    check (approval_status in ('freigabe_offen', 'freigegeben', 'abgelehnt', 'nicht_noetig')),
  payment_status text not null default 'offen'
    check (payment_status in ('offen', 'teilbezahlt', 'bezahlt')),
  paid_at timestamptz,
  payment_method text not null default ''
    check (payment_method in ('', 'ueberweisung', 'lastschrift', 'kreditkarte', 'bar', 'sonstiges')),
  external_booking_ref text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  approved_by_user_id uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejected_by_user_id uuid references auth.users(id) on delete set null,
  rejected_reason text not null default ''
);

create table if not exists public.incoming_invoice_files (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.incoming_invoices(id) on delete cascade,
  storage_mode text not null default 'nas' check (storage_mode in ('nas', 'supabase')),
  nas_path text not null default '',
  original_name text not null default '',
  mime_type text not null default 'application/pdf',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  checksum_sha256 text not null default '',
  uploaded_at timestamptz not null default now(),
  uploaded_by_user_id uuid references auth.users(id) on delete set null,
  check (
    (storage_mode = 'nas' and length(trim(coalesce(nas_path, ''))) > 0)
    or (storage_mode = 'supabase')
  )
);

create table if not exists public.incoming_invoice_approvers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null
);

create table if not exists public.incoming_invoice_events (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.incoming_invoices(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'created',
      'updated',
      'approval_submitted',
      'approved',
      'rejected',
      'marked_paid',
      'payment_reopened',
      'file_added',
      'file_removed'
    )
  ),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null
);

create index if not exists idx_incoming_invoices_statuses
  on public.incoming_invoices (approval_status, payment_status);

create index if not exists idx_incoming_invoices_due_date
  on public.incoming_invoices (due_date);

create index if not exists idx_incoming_invoices_invoice_date
  on public.incoming_invoices (invoice_date);

create index if not exists idx_incoming_invoices_supplier
  on public.incoming_invoices (supplier_name);

create index if not exists idx_incoming_invoices_supplier_company_id
  on public.incoming_invoices (supplier_company_id);

create index if not exists idx_incoming_invoice_files_invoice_id
  on public.incoming_invoice_files (invoice_id);

create index if not exists idx_incoming_invoice_events_invoice_id_created_at
  on public.incoming_invoice_events (invoice_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_incoming_invoices_updated_at on public.incoming_invoices;
create trigger trg_incoming_invoices_updated_at
before update on public.incoming_invoices
for each row execute procedure public.set_updated_at();

create or replace function public.is_active_employee()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id::text = auth.uid()::text
      and p.status = 'active'
  );
$$;

create or replace function public.is_invoice_approver()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_admin()
    or exists (
      select 1
      from public.incoming_invoice_approvers a
      where a.user_id::text = auth.uid()::text
        and a.is_active = true
    ),
    false
  );
$$;

create or replace function public.enforce_invoice_status_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.approval_status in ('freigegeben', 'abgelehnt')
       and new.approval_status is distinct from old.approval_status
       and not public.is_invoice_approver() then
      raise exception 'Nur freigabeberechtigte Benutzer duerfen den Freigabestatus setzen.';
    end if;

    if new.payment_status = 'bezahlt'
       and new.payment_status is distinct from old.payment_status
       and new.approval_status = 'freigabe_offen' then
      raise exception 'Rechnung kann nicht als bezahlt markiert werden, solange die Freigabe offen ist.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_incoming_invoices_permission_guard on public.incoming_invoices;
create trigger trg_incoming_invoices_permission_guard
before update on public.incoming_invoices
for each row execute procedure public.enforce_invoice_status_permissions();

create or replace function public.log_incoming_invoice_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ev_type text;
  ev_payload jsonb;
begin
  if tg_op = 'INSERT' then
    ev_type := 'created';
    ev_payload := jsonb_build_object('approval_status', new.approval_status, 'payment_status', new.payment_status);
  elsif tg_op = 'UPDATE' then
    ev_type := 'updated';
    ev_payload := jsonb_build_object(
      'approval_status_before', old.approval_status,
      'approval_status_after', new.approval_status,
      'payment_status_before', old.payment_status,
      'payment_status_after', new.payment_status
    );

    if new.approval_status is distinct from old.approval_status and new.approval_status = 'freigegeben' then
      ev_type := 'approved';
    elsif new.approval_status is distinct from old.approval_status and new.approval_status = 'abgelehnt' then
      ev_type := 'rejected';
    elsif new.payment_status is distinct from old.payment_status and new.payment_status = 'bezahlt' then
      ev_type := 'marked_paid';
    elsif new.payment_status is distinct from old.payment_status and old.payment_status = 'bezahlt' then
      ev_type := 'payment_reopened';
    end if;
  else
    return new;
  end if;

  insert into public.incoming_invoice_events (invoice_id, event_type, payload, created_by_user_id)
  values (new.id, ev_type, coalesce(ev_payload, '{}'::jsonb), auth.uid());

  return new;
end;
$$;

drop trigger if exists trg_incoming_invoices_event_log on public.incoming_invoices;
create trigger trg_incoming_invoices_event_log
after insert or update on public.incoming_invoices
for each row execute procedure public.log_incoming_invoice_change();

alter table public.incoming_invoices enable row level security;
alter table public.incoming_invoice_files enable row level security;
alter table public.incoming_invoice_approvers enable row level security;
alter table public.incoming_invoice_events enable row level security;

drop policy if exists "incoming_invoices_active_select" on public.incoming_invoices;
create policy "incoming_invoices_active_select"
on public.incoming_invoices
for select
to authenticated
using (public.is_active_employee());

drop policy if exists "incoming_invoices_active_insert" on public.incoming_invoices;
create policy "incoming_invoices_active_insert"
on public.incoming_invoices
for insert
to authenticated
with check (public.is_active_employee());

drop policy if exists "incoming_invoices_active_update" on public.incoming_invoices;
create policy "incoming_invoices_active_update"
on public.incoming_invoices
for update
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

drop policy if exists "incoming_invoices_admin_delete" on public.incoming_invoices;
create policy "incoming_invoices_admin_delete"
on public.incoming_invoices
for delete
to authenticated
using (public.is_admin());

drop policy if exists "incoming_invoice_files_active_select" on public.incoming_invoice_files;
create policy "incoming_invoice_files_active_select"
on public.incoming_invoice_files
for select
to authenticated
using (
  public.is_active_employee()
  and exists (
    select 1
    from public.incoming_invoices i
    where i.id = incoming_invoice_files.invoice_id
  )
);

drop policy if exists "incoming_invoice_files_active_insert" on public.incoming_invoice_files;
create policy "incoming_invoice_files_active_insert"
on public.incoming_invoice_files
for insert
to authenticated
with check (
  public.is_active_employee()
  and exists (
    select 1
    from public.incoming_invoices i
    where i.id = incoming_invoice_files.invoice_id
  )
);

drop policy if exists "incoming_invoice_files_active_delete" on public.incoming_invoice_files;
create policy "incoming_invoice_files_active_delete"
on public.incoming_invoice_files
for delete
to authenticated
using (public.is_active_employee());

drop policy if exists "incoming_invoice_approvers_admin_select" on public.incoming_invoice_approvers;
create policy "incoming_invoice_approvers_admin_select"
on public.incoming_invoice_approvers
for select
to authenticated
using (public.is_admin());

drop policy if exists "incoming_invoice_approvers_admin_insert" on public.incoming_invoice_approvers;
create policy "incoming_invoice_approvers_admin_insert"
on public.incoming_invoice_approvers
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "incoming_invoice_approvers_admin_update" on public.incoming_invoice_approvers;
create policy "incoming_invoice_approvers_admin_update"
on public.incoming_invoice_approvers
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "incoming_invoice_approvers_admin_delete" on public.incoming_invoice_approvers;
create policy "incoming_invoice_approvers_admin_delete"
on public.incoming_invoice_approvers
for delete
to authenticated
using (public.is_admin());

drop policy if exists "incoming_invoice_events_active_select" on public.incoming_invoice_events;
create policy "incoming_invoice_events_active_select"
on public.incoming_invoice_events
for select
to authenticated
using (public.is_active_employee());

drop policy if exists "incoming_invoice_events_active_insert" on public.incoming_invoice_events;
create policy "incoming_invoice_events_active_insert"
on public.incoming_invoice_events
for insert
to authenticated
with check (public.is_active_employee());

create or replace view public.v_invoices_pending_approval as
select *
from public.incoming_invoices
where approval_status = 'freigabe_offen'
  and payment_status <> 'bezahlt';

create or replace view public.v_invoices_paid as
select *
from public.incoming_invoices
where payment_status = 'bezahlt';

-- -------------------------------------------------------------
-- END FILE: supabase/patch_incoming_invoices.sql
-- -------------------------------------------------------------


-- -------------------------------------------------------------
-- BEGIN FILE: supabase/patch_vertriebsmitarbeiter_role.sql
-- -------------------------------------------------------------
-- Rolle "vertriebsmitarbeiter" in allen relevanten Constraints erlauben
-- Im Supabase SQL Editor ausfuehren. Idempotent.

-- 1) Legacy-Werte normalisieren
update public.profiles
set role = 'vertriebsmitarbeiter'
where lower(coalesce(role, '')) = 'vertrieb';

update public.employee_invites
set role = 'vertriebsmitarbeiter'
where lower(coalesce(role, '')) = 'vertrieb';

-- 2) Rollen-Constraints erweitern
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'superadmin', 'supaadmin', 'mitarbeiter', 'vertriebsmitarbeiter'));

alter table public.employee_invites
  drop constraint if exists employee_invites_role_check;

alter table public.employee_invites
  add constraint employee_invites_role_check
  check (role in ('admin', 'superadmin', 'supaadmin', 'mitarbeiter', 'vertriebsmitarbeiter'));

-- 3) Optional: provider_notes Rollen-Constraint ebenfalls erweitern
-- (falls Tabelle/Constraint vorhanden)
do $$
begin
  if to_regclass('public.provider_notes') is null then
    return;
  end if;

  update public.provider_notes
  set created_by_role = 'vertriebsmitarbeiter'
  where lower(coalesce(created_by_role, '')) = 'vertrieb';

  update public.provider_notes
  set created_by_role = 'mitarbeiter'
  where lower(coalesce(created_by_role, '')) not in ('mitarbeiter', 'vertriebsmitarbeiter', 'admin', 'superadmin', 'supaadmin');

  alter table public.provider_notes
    drop constraint if exists provider_notes_created_by_role_check;

  alter table public.provider_notes
    add constraint provider_notes_created_by_role_check
    check (created_by_role in ('mitarbeiter', 'vertriebsmitarbeiter', 'admin', 'superadmin', 'supaadmin'));
end $$;

-- -------------------------------------------------------------
-- END FILE: supabase/patch_vertriebsmitarbeiter_role.sql
-- -------------------------------------------------------------


-- -------------------------------------------------------------
-- BEGIN FILE: supabase/patch_supaadmin_role.sql
-- -------------------------------------------------------------
-- Fuegt die Rolle "superadmin" hinzu (volle Admin-Rechte).
-- Legacy-Wert "supaadmin" wird auf "superadmin" normalisiert.
-- Im Supabase SQL Editor ausfuehren.

update public.profiles
set role = 'superadmin'
where role = 'supaadmin';

update public.employee_invites
set role = 'superadmin'
where role = 'supaadmin';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'superadmin', 'supaadmin', 'mitarbeiter', 'vertriebsmitarbeiter'));

alter table public.employee_invites drop constraint if exists employee_invites_role_check;
alter table public.employee_invites
  add constraint employee_invites_role_check
  check (role in ('admin', 'superadmin', 'supaadmin', 'mitarbeiter', 'vertriebsmitarbeiter'));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('admin', 'superadmin', 'supaadmin'), false);
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
    where p.role in ('admin', 'superadmin', 'supaadmin')
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
    case when assigned_role in ('admin', 'superadmin', 'supaadmin') then 'active' else 'pending' end
  )
  on conflict (user_id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role = excluded.role,
        phone = excluded.phone,
        address = excluded.address,
        status = case when excluded.role in ('admin', 'superadmin', 'supaadmin') then 'active' else 'pending' end,
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

-- Beispiel: bestehenden User zum Superadmin machen
-- update public.profiles
-- set role = 'superadmin', status = 'active', updated_at = now()
-- where email = 'deine.mail@beispiel.at';

-- -------------------------------------------------------------
-- END FILE: supabase/patch_supaadmin_role.sql
-- -------------------------------------------------------------


-- -------------------------------------------------------------
-- BEGIN FILE: supabase/seed_categories.sql
-- -------------------------------------------------------------
-- Seed: Standard-Hauptkategorien, Themenbereiche und Themen fuer Vertriebsmanager
-- Fuehrt die komplette Katalogstruktur ein und laesst bestehende Mitarbeiter/Anbieter unveraendert.

insert into public.app_state (id, payload, updated_at)
values (
  'main',
  '{"sessionUserId":"","users":[],"providers":[],"categories":[]}'::jsonb,
  now()
)
on conflict (id) do nothing;

update public.app_state
set payload = jsonb_set(
    coalesce(payload, '{}'::jsonb),
    '{categories}',
    '[
  {
    "id": "cat_familie_kinder",
    "name": "Familie & Kinder",
    "subcategories": [
      {
        "id": "sub_kinderkurse_aktivitaeten",
        "name": "Kinderkurse & Aktivitäten",
        "topics": [
          {
            "id": "topic_sub_kinderkurse_aktivitaeten_001",
            "name": "Schwimmkurs Kinder"
          },
          {
            "id": "topic_sub_kinderkurse_aktivitaeten_002",
            "name": "Kinderturnen"
          },
          {
            "id": "topic_sub_kinderkurse_aktivitaeten_003",
            "name": "Tanzkurs Kinder"
          },
          {
            "id": "topic_sub_kinderkurse_aktivitaeten_004",
            "name": "Malkurs Kinder"
          },
          {
            "id": "topic_sub_kinderkurse_aktivitaeten_005",
            "name": "Musikunterricht Kinder"
          },
          {
            "id": "topic_sub_kinderkurse_aktivitaeten_006",
            "name": "Theaterkurs Kinder"
          }
        ]
      },
      {
        "id": "sub_kreativitaet_basteln_kinder",
        "name": "Kreativität & Basteln für Kinder",
        "topics": [
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_001",
            "name": "Bastelkurs Kinder"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_002",
            "name": "Malen für Kinder"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_003",
            "name": "Töpfern Kinder"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_004",
            "name": "DIY Projekte Kinder"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_005",
            "name": "Zeichnen lernen Kinder"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_006",
            "name": "Handwerken Kinder"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_007",
            "name": "Nähen für Kinder"
          },
          {
            "id": "topic_sub_kreativitaet_basteln_kinder_008",
            "name": "Kreativ Workshop Familie"
          }
        ]
      },
      {
        "id": "sub_sport_bewegung_kinder",
        "name": "Sport & Bewegung für Kinder",
        "topics": [
          {
            "id": "topic_sub_sport_bewegung_kinder_001",
            "name": "Fußballtraining Kinder"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_002",
            "name": "Kampfsport Kinder"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_003",
            "name": "Yoga für Kinder"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_004",
            "name": "Klettern Kinder"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_005",
            "name": "Reiten Kinder"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_006",
            "name": "Ballett Kinder"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_007",
            "name": "Leichtathletik Kinder"
          },
          {
            "id": "topic_sub_sport_bewegung_kinder_008",
            "name": "Bewegung & Motorik"
          }
        ]
      },
      {
        "id": "sub_baby_kleinkind",
        "name": "Baby & Kleinkind",
        "topics": [
          {
            "id": "topic_sub_baby_kleinkind_001",
            "name": "Baby Massage"
          },
          {
            "id": "topic_sub_baby_kleinkind_002",
            "name": "Eltern-Kind Turnen"
          },
          {
            "id": "topic_sub_baby_kleinkind_003",
            "name": "Frühförderung"
          },
          {
            "id": "topic_sub_baby_kleinkind_004",
            "name": "Spielgruppen"
          },
          {
            "id": "topic_sub_baby_kleinkind_005",
            "name": "Babyschwimmen"
          },
          {
            "id": "topic_sub_baby_kleinkind_006",
            "name": "Musik für Babys"
          },
          {
            "id": "topic_sub_baby_kleinkind_007",
            "name": "Erste Hilfe am Kind"
          },
          {
            "id": "topic_sub_baby_kleinkind_008",
            "name": "Schlafberatung Baby"
          }
        ]
      },
      {
        "id": "sub_elternkurse_coaching",
        "name": "Elternkurse & Coaching",
        "topics": [
          {
            "id": "topic_sub_elternkurse_coaching_001",
            "name": "Elterncoaching"
          },
          {
            "id": "topic_sub_elternkurse_coaching_002",
            "name": "Erziehungskurse"
          },
          {
            "id": "topic_sub_elternkurse_coaching_003",
            "name": "Kommunikation mit Kindern"
          },
          {
            "id": "topic_sub_elternkurse_coaching_004",
            "name": "Konflikte lösen Familie"
          },
          {
            "id": "topic_sub_elternkurse_coaching_005",
            "name": "Pubertät verstehen"
          },
          {
            "id": "topic_sub_elternkurse_coaching_006",
            "name": "Stressmanagement Eltern"
          },
          {
            "id": "topic_sub_elternkurse_coaching_007",
            "name": "Vereinbarkeit Familie & Beruf"
          },
          {
            "id": "topic_sub_elternkurse_coaching_008",
            "name": "Achtsamkeit für Eltern"
          }
        ]
      },
      {
        "id": "sub_freizeit_ausfluege_kinder",
        "name": "Freizeit & Ausflüge mit Kindern",
        "topics": [
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_001",
            "name": "Indoor Spielplatz"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_002",
            "name": "Freizeitpark Besuch"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_003",
            "name": "Zoo Erlebnis"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_004",
            "name": "Bauernhof Erlebnis"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_005",
            "name": "Familienausflug Natur"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_006",
            "name": "Erlebnispark"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_007",
            "name": "Kindergeburtstag Aktivitäten"
          },
          {
            "id": "topic_sub_freizeit_ausfluege_kinder_008",
            "name": "Ferienprogramme"
          }
        ]
      },
      {
        "id": "sub_gemeinsame_familienerlebnisse",
        "name": "Gemeinsame Familienerlebnisse",
        "topics": [
          {
            "id": "topic_sub_gemeinsame_familienerlebnisse_001",
            "name": "Outdoor Abenteuer Familie"
          },
          {
            "id": "topic_sub_gemeinsame_familienerlebnisse_002",
            "name": "Familien Fotoshooting"
          },
          {
            "id": "topic_sub_gemeinsame_familienerlebnisse_003",
            "name": "Kurzurlaub Familie"
          }
        ]
      }
    ]
  },
  {
    "id": "cat_lernen_weiterbildung",
    "name": "Lernen & Weiterbildung",
    "subcategories": [
      {
        "id": "sub_sprachen_lernen",
        "name": "Sprachen lernen",
        "topics": [
          {
            "id": "topic_sub_sprachen_lernen_001",
            "name": "Englisch lernen"
          },
          {
            "id": "topic_sub_sprachen_lernen_002",
            "name": "Deutsch lernen"
          },
          {
            "id": "topic_sub_sprachen_lernen_003",
            "name": "Spanisch lernen"
          },
          {
            "id": "topic_sub_sprachen_lernen_004",
            "name": "Französisch lernen"
          },
          {
            "id": "topic_sub_sprachen_lernen_005",
            "name": "Italienisch lernen"
          },
          {
            "id": "topic_sub_sprachen_lernen_006",
            "name": "Business Englisch"
          },
          {
            "id": "topic_sub_sprachen_lernen_007",
            "name": "Konversationskurs"
          },
          {
            "id": "topic_sub_sprachen_lernen_008",
            "name": "Sprachzertifikat Vorbereitung"
          }
        ]
      },
      {
        "id": "sub_programmieren_it",
        "name": "Programmieren & IT",
        "topics": [
          {
            "id": "topic_sub_programmieren_it_001",
            "name": "Python programmieren"
          },
          {
            "id": "topic_sub_programmieren_it_002",
            "name": "Webentwicklung (HTML, CSS)"
          },
          {
            "id": "topic_sub_programmieren_it_003",
            "name": "JavaScript lernen"
          },
          {
            "id": "topic_sub_programmieren_it_004",
            "name": "App Entwicklung"
          },
          {
            "id": "topic_sub_programmieren_it_005",
            "name": "Data Science Grundlagen"
          },
          {
            "id": "topic_sub_programmieren_it_006",
            "name": "Künstliche Intelligenz"
          },
          {
            "id": "topic_sub_programmieren_it_007",
            "name": "Cloud Computing"
          },
          {
            "id": "topic_sub_programmieren_it_008",
            "name": "IT Grundlagen"
          }
        ]
      },
      {
        "id": "sub_business_buero_skills",
        "name": "Business & Büro Skills",
        "topics": [
          {
            "id": "topic_sub_business_buero_skills_001",
            "name": "Excel Kurs"
          },
          {
            "id": "topic_sub_business_buero_skills_002",
            "name": "PowerPoint Training"
          },
          {
            "id": "topic_sub_business_buero_skills_003",
            "name": "Projektmanagement"
          },
          {
            "id": "topic_sub_business_buero_skills_004",
            "name": "Zeitmanagement"
          },
          {
            "id": "topic_sub_business_buero_skills_005",
            "name": "Prozessmanagement"
          },
          {
            "id": "topic_sub_business_buero_skills_006",
            "name": "Business Analyse"
          },
          {
            "id": "topic_sub_business_buero_skills_007",
            "name": "MS Office Grundlagen"
          },
          {
            "id": "topic_sub_business_buero_skills_008",
            "name": "Organisation im Büro"
          }
        ]
      },
      {
        "id": "sub_marketing_online_business",
        "name": "Marketing & Online Business",
        "topics": [
          {
            "id": "topic_sub_marketing_online_business_001",
            "name": "SEO lernen"
          },
          {
            "id": "topic_sub_marketing_online_business_002",
            "name": "Google Ads (SEA)"
          },
          {
            "id": "topic_sub_marketing_online_business_003",
            "name": "Social Media Marketing"
          },
          {
            "id": "topic_sub_marketing_online_business_004",
            "name": "Content Marketing"
          },
          {
            "id": "topic_sub_marketing_online_business_005",
            "name": "E-Mail Marketing"
          },
          {
            "id": "topic_sub_marketing_online_business_006",
            "name": "Performance Marketing"
          },
          {
            "id": "topic_sub_marketing_online_business_007",
            "name": "Influencer Marketing"
          },
          {
            "id": "topic_sub_marketing_online_business_008",
            "name": "Online Business aufbauen"
          }
        ]
      },
      {
        "id": "sub_design_foto_video",
        "name": "Design, Foto & Video",
        "topics": [
          {
            "id": "topic_sub_design_foto_video_001",
            "name": "Fotografie Grundlagen"
          },
          {
            "id": "topic_sub_design_foto_video_002",
            "name": "Bildbearbeitung (Photoshop, Lightroom...)"
          },
          {
            "id": "topic_sub_design_foto_video_003",
            "name": "Grafikdesign"
          },
          {
            "id": "topic_sub_design_foto_video_004",
            "name": "Videobearbeitung"
          },
          {
            "id": "topic_sub_design_foto_video_005",
            "name": "Content Creation"
          },
          {
            "id": "topic_sub_design_foto_video_006",
            "name": "UI/UX Design"
          },
          {
            "id": "topic_sub_design_foto_video_007",
            "name": "Illustration"
          },
          {
            "id": "topic_sub_design_foto_video_008",
            "name": "Social Media Content erstellen"
          }
        ]
      },
      {
        "id": "sub_schule_nachhilfe",
        "name": "Schule & Nachhilfe",
        "topics": [
          {
            "id": "topic_sub_schule_nachhilfe_001",
            "name": "Mathe Nachhilfe"
          },
          {
            "id": "topic_sub_schule_nachhilfe_002",
            "name": "Deutsch Nachhilfe"
          },
          {
            "id": "topic_sub_schule_nachhilfe_003",
            "name": "Englisch Nachhilfe"
          },
          {
            "id": "topic_sub_schule_nachhilfe_004",
            "name": "Physik Nachhilfe"
          },
          {
            "id": "topic_sub_schule_nachhilfe_005",
            "name": "Chemie Nachhilfe"
          },
          {
            "id": "topic_sub_schule_nachhilfe_006",
            "name": "Lerntechniken"
          },
          {
            "id": "topic_sub_schule_nachhilfe_007",
            "name": "Hausaufgabenhilfe"
          },
          {
            "id": "topic_sub_schule_nachhilfe_008",
            "name": "Prüfungsvorbereitung Schule"
          }
        ]
      },
      {
        "id": "sub_studium_akademische_skills",
        "name": "Studium & akademische Skills",
        "topics": [
          {
            "id": "topic_sub_studium_akademische_skills_001",
            "name": "Wissenschaftliches Arbeiten"
          },
          {
            "id": "topic_sub_studium_akademische_skills_002",
            "name": "Bachelorarbeit schreiben"
          },
          {
            "id": "topic_sub_studium_akademische_skills_003",
            "name": "Masterarbeit schreiben"
          },
          {
            "id": "topic_sub_studium_akademische_skills_004",
            "name": "Statistik Grundlagen"
          },
          {
            "id": "topic_sub_studium_akademische_skills_005",
            "name": "Präsentationen halten"
          },
          {
            "id": "topic_sub_studium_akademische_skills_006",
            "name": "Recherche Methoden"
          },
          {
            "id": "topic_sub_studium_akademische_skills_007",
            "name": "Zeitmanagement im Studium"
          },
          {
            "id": "topic_sub_studium_akademische_skills_008",
            "name": "Prüfungsvorbereitung Uni"
          }
        ]
      },
      {
        "id": "sub_kommunikation_persoenliche_skills",
        "name": "Kommunikation & persönliche Skills",
        "topics": [
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_001",
            "name": "Kommunikation verbessern"
          },
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_002",
            "name": "Rhetorik Training"
          },
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_003",
            "name": "Selbstbewusstsein stärken"
          },
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_004",
            "name": "Konfliktmanagement"
          },
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_005",
            "name": "Verhandlungstechniken"
          },
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_006",
            "name": "Körpersprache verstehen"
          },
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_007",
            "name": "Entscheidungsfindung"
          },
          {
            "id": "topic_sub_kommunikation_persoenliche_skills_008",
            "name": "Kritikfähigkeit"
          }
        ]
      }
    ]
  },
  {
    "id": "cat_erlebnisse_aktivitaeten",
    "name": "Erlebnisse & Aktivitäten",
    "subcategories": [
      {
        "id": "sub_abenteuer",
        "name": "Abenteuer",
        "topics": [
          {
            "id": "topic_sub_abenteuer_001",
            "name": "Fallschirmsprung"
          },
          {
            "id": "topic_sub_abenteuer_002",
            "name": "Bungee Jumping"
          },
          {
            "id": "topic_sub_abenteuer_003",
            "name": "Canyoning"
          },
          {
            "id": "topic_sub_abenteuer_004",
            "name": "Rafting"
          },
          {
            "id": "topic_sub_abenteuer_005",
            "name": "Klettersteig"
          },
          {
            "id": "topic_sub_abenteuer_006",
            "name": "Survival Training"
          },
          {
            "id": "topic_sub_abenteuer_007",
            "name": "Höhlentour"
          },
          {
            "id": "topic_sub_abenteuer_008",
            "name": "Base Jump"
          }
        ]
      },
      {
        "id": "sub_outdoor_natur",
        "name": "Outdoor & Natur",
        "topics": [
          {
            "id": "topic_sub_outdoor_natur_001",
            "name": "Wandern geführt"
          },
          {
            "id": "topic_sub_outdoor_natur_002",
            "name": "Schneeschuhwandern"
          },
          {
            "id": "topic_sub_outdoor_natur_003",
            "name": "Bergsteigen"
          },
          {
            "id": "topic_sub_outdoor_natur_004",
            "name": "Wildnis Camp"
          },
          {
            "id": "topic_sub_outdoor_natur_005",
            "name": "Nationalpark Tour"
          },
          {
            "id": "topic_sub_outdoor_natur_006",
            "name": "Kräuterwanderung"
          }
        ]
      },
      {
        "id": "sub_kochen_grillen",
        "name": "Kochen & Grillen",
        "topics": [
          {
            "id": "topic_sub_kochen_grillen_001",
            "name": "Kochkurs italienisch"
          },
          {
            "id": "topic_sub_kochen_grillen_002",
            "name": "Kochkurs asiatisch"
          },
          {
            "id": "topic_sub_kochen_grillen_003",
            "name": "Sushi Kochkurs"
          },
          {
            "id": "topic_sub_kochen_grillen_004",
            "name": "Vegan Kochkurs"
          },
          {
            "id": "topic_sub_kochen_grillen_005",
            "name": "Thai Kochkurs"
          },
          {
            "id": "topic_sub_kochen_grillen_006",
            "name": "Pasta Workshop"
          },
          {
            "id": "topic_sub_kochen_grillen_007",
            "name": "Grillkurs"
          },
          {
            "id": "topic_sub_kochen_grillen_008",
            "name": "BBQ Workshop"
          },
          {
            "id": "topic_sub_kochen_grillen_009",
            "name": "Steak Grillkurs"
          },
          {
            "id": "topic_sub_kochen_grillen_010",
            "name": "Bierverkostung"
          }
        ]
      },
      {
        "id": "sub_wein_bier_tastings",
        "name": "Wein, Bier & Tastings",
        "topics": [
          {
            "id": "topic_sub_wein_bier_tastings_001",
            "name": "Weinverkostung"
          },
          {
            "id": "topic_sub_wein_bier_tastings_002",
            "name": "Whisky Tasting"
          },
          {
            "id": "topic_sub_wein_bier_tastings_003",
            "name": "Gin Tasting"
          },
          {
            "id": "topic_sub_wein_bier_tastings_004",
            "name": "Rum Tasting"
          },
          {
            "id": "topic_sub_wein_bier_tastings_005",
            "name": "Kaffee Tasting"
          },
          {
            "id": "topic_sub_wein_bier_tastings_006",
            "name": "Cocktail Workshop"
          }
        ]
      },
      {
        "id": "sub_essen_besondere_dinner",
        "name": "Essen & besondere Dinner",
        "topics": [
          {
            "id": "topic_sub_essen_besondere_dinner_001",
            "name": "Barista Kurs"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_002",
            "name": "Dinner in the Dark"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_003",
            "name": "Luxus Dinner"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_004",
            "name": "Gourmet Erlebnis"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_005",
            "name": "Private Chef Erlebnis"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_006",
            "name": "Candle Light Dinner"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_007",
            "name": "Dinner Event"
          },
          {
            "id": "topic_sub_essen_besondere_dinner_008",
            "name": "Degustationsmenü"
          }
        ]
      },
      {
        "id": "sub_wellness_entspannung",
        "name": "Wellness & Entspannung",
        "topics": [
          {
            "id": "topic_sub_wellness_entspannung_001",
            "name": "Spa Tagespass"
          },
          {
            "id": "topic_sub_wellness_entspannung_002",
            "name": "Massage Erlebnis"
          },
          {
            "id": "topic_sub_wellness_entspannung_003",
            "name": "Sauna Erlebnis"
          },
          {
            "id": "topic_sub_wellness_entspannung_004",
            "name": "Thermenbesuch"
          },
          {
            "id": "topic_sub_wellness_entspannung_005",
            "name": "Yoga Retreat"
          },
          {
            "id": "topic_sub_wellness_entspannung_006",
            "name": "Meditation Workshop"
          },
          {
            "id": "topic_sub_wellness_entspannung_007",
            "name": "Achtsamkeitskurs"
          }
        ]
      },
      {
        "id": "sub_auto_motorsport_fahren",
        "name": "Auto, Motorsport & Fahren",
        "topics": [
          {
            "id": "topic_sub_auto_motorsport_fahren_001",
            "name": "Sportwagen fahren"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_002",
            "name": "Rennstrecke fahren"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_003",
            "name": "Quad fahren"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_004",
            "name": "Kart fahren"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_005",
            "name": "Motorrad Training"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_006",
            "name": "Offroad fahren"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_007",
            "name": "Drift Training"
          },
          {
            "id": "topic_sub_auto_motorsport_fahren_008",
            "name": "Jetski fahren"
          }
        ]
      },
      {
        "id": "sub_shows_spiele_unterhaltung",
        "name": "Shows, Spiele & Unterhaltung",
        "topics": [
          {
            "id": "topic_sub_shows_spiele_unterhaltung_001",
            "name": "Escape Room"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_002",
            "name": "Krimi Dinner"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_003",
            "name": "Comedy Show"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_004",
            "name": "Theater Workshop"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_005",
            "name": "Improvisation Kurs"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_006",
            "name": "Quiz Event"
          },
          {
            "id": "topic_sub_shows_spiele_unterhaltung_007",
            "name": "VR Erlebnis"
          }
        ]
      }
    ]
  },
  {
    "id": "cat_gesundheit_fitness",
    "name": "Gesundheit & Fitness",
    "subcategories": [
      {
        "id": "sub_fitness_training",
        "name": "Fitness & Training",
        "topics": [
          {
            "id": "topic_sub_fitness_training_001",
            "name": "Personal Training"
          },
          {
            "id": "topic_sub_fitness_training_002",
            "name": "Fitnesskurs"
          },
          {
            "id": "topic_sub_fitness_training_003",
            "name": "Krafttraining"
          },
          {
            "id": "topic_sub_fitness_training_004",
            "name": "Ausdauertraining"
          },
          {
            "id": "topic_sub_fitness_training_005",
            "name": "Functional Training"
          },
          {
            "id": "topic_sub_fitness_training_006",
            "name": "HIIT Training"
          }
        ]
      },
      {
        "id": "sub_ernaehrung_abnehmen",
        "name": "Ernährung & Abnehmen",
        "topics": [
          {
            "id": "topic_sub_ernaehrung_abnehmen_001",
            "name": "Ernährungsberatung"
          },
          {
            "id": "topic_sub_ernaehrung_abnehmen_002",
            "name": "Abnehmen Coaching"
          },
          {
            "id": "topic_sub_ernaehrung_abnehmen_003",
            "name": "Muskelaufbau Ernährung"
          },
          {
            "id": "topic_sub_ernaehrung_abnehmen_004",
            "name": "Vegan Ernährung"
          },
          {
            "id": "topic_sub_ernaehrung_abnehmen_005",
            "name": "Sporternährung"
          },
          {
            "id": "topic_sub_ernaehrung_abnehmen_006",
            "name": "Diätberatung"
          },
          {
            "id": "topic_sub_ernaehrung_abnehmen_007",
            "name": "Gesunde Ernährung"
          }
        ]
      },
      {
        "id": "sub_yoga_meditation",
        "name": "Yoga & Meditation",
        "topics": [
          {
            "id": "topic_sub_yoga_meditation_001",
            "name": "Yoga Kurs"
          },
          {
            "id": "topic_sub_yoga_meditation_002",
            "name": "Meditation lernen"
          },
          {
            "id": "topic_sub_yoga_meditation_003",
            "name": "Achtsamkeitstraining"
          },
          {
            "id": "topic_sub_yoga_meditation_004",
            "name": "Atemübungen"
          },
          {
            "id": "topic_sub_yoga_meditation_005",
            "name": "Entspannungsübungen"
          },
          {
            "id": "topic_sub_yoga_meditation_006",
            "name": "Mindfulness Training"
          }
        ]
      },
      {
        "id": "sub_mental_health_wohlbefinden",
        "name": "Mental Health & Wohlbefinden",
        "topics": [
          {
            "id": "topic_sub_mental_health_wohlbefinden_001",
            "name": "Stressbewältigung"
          },
          {
            "id": "topic_sub_mental_health_wohlbefinden_002",
            "name": "Burnout Prävention"
          },
          {
            "id": "topic_sub_mental_health_wohlbefinden_003",
            "name": "Resilienz Training"
          },
          {
            "id": "topic_sub_mental_health_wohlbefinden_004",
            "name": "Coaching mentale Stärke"
          },
          {
            "id": "topic_sub_mental_health_wohlbefinden_005",
            "name": "Entspannungstechniken"
          }
        ]
      },
      {
        "id": "sub_gesundheit_praevention",
        "name": "Gesundheit & Prävention",
        "topics": [
          {
            "id": "topic_sub_gesundheit_praevention_001",
            "name": "Gesundheitscheck"
          },
          {
            "id": "topic_sub_gesundheit_praevention_002",
            "name": "Rückentraining"
          },
          {
            "id": "topic_sub_gesundheit_praevention_003",
            "name": "Haltung verbessern"
          },
          {
            "id": "topic_sub_gesundheit_praevention_004",
            "name": "Präventionskurse"
          },
          {
            "id": "topic_sub_gesundheit_praevention_005",
            "name": "Beweglichkeit verbessern"
          },
          {
            "id": "topic_sub_gesundheit_praevention_006",
            "name": "Herz-Kreislauf Training"
          },
          {
            "id": "topic_sub_gesundheit_praevention_007",
            "name": "Ergonomie Training"
          },
          {
            "id": "topic_sub_gesundheit_praevention_008",
            "name": "Gesundheitsberatung"
          }
        ]
      },
      {
        "id": "sub_therapie_regeneration",
        "name": "Therapie & Regeneration",
        "topics": [
          {
            "id": "topic_sub_therapie_regeneration_001",
            "name": "Physiotherapie"
          },
          {
            "id": "topic_sub_therapie_regeneration_002",
            "name": "Massage Therapie"
          },
          {
            "id": "topic_sub_therapie_regeneration_003",
            "name": "Osteopathie"
          },
          {
            "id": "topic_sub_therapie_regeneration_004",
            "name": "Rehabilitation Training"
          },
          {
            "id": "topic_sub_therapie_regeneration_005",
            "name": "Schmerztherapie"
          },
          {
            "id": "topic_sub_therapie_regeneration_006",
            "name": "Faszien Training"
          },
          {
            "id": "topic_sub_therapie_regeneration_007",
            "name": "Regenerationstechniken"
          },
          {
            "id": "topic_sub_therapie_regeneration_008",
            "name": "Sportmassage"
          }
        ]
      },
      {
        "id": "sub_schlaf_regeneration",
        "name": "Schlaf & Regeneration",
        "topics": [
          {
            "id": "topic_sub_schlaf_regeneration_001",
            "name": "Schlafcoaching"
          },
          {
            "id": "topic_sub_schlaf_regeneration_002",
            "name": "Schlaf verbessern"
          },
          {
            "id": "topic_sub_schlaf_regeneration_003",
            "name": "Einschlaftraining"
          },
          {
            "id": "topic_sub_schlaf_regeneration_004",
            "name": "Abendroutinen"
          },
          {
            "id": "topic_sub_schlaf_regeneration_005",
            "name": "Stressfrei schlafen"
          },
          {
            "id": "topic_sub_schlaf_regeneration_006",
            "name": "Schlafanalyse"
          },
          {
            "id": "topic_sub_schlaf_regeneration_007",
            "name": "Regeneration im Alltag"
          },
          {
            "id": "topic_sub_schlaf_regeneration_008",
            "name": "Entspannungsrituale"
          }
        ]
      },
      {
        "id": "sub_koerper_balance",
        "name": "Körper & Balance",
        "topics": [
          {
            "id": "topic_sub_koerper_balance_001",
            "name": "Pilates Kurs"
          },
          {
            "id": "topic_sub_koerper_balance_002",
            "name": "Rückenschule"
          },
          {
            "id": "topic_sub_koerper_balance_003",
            "name": "Gleichgewichtstraining"
          },
          {
            "id": "topic_sub_koerper_balance_004",
            "name": "Beweglichkeitstraining"
          },
          {
            "id": "topic_sub_koerper_balance_005",
            "name": "Körperhaltung verbessern"
          },
          {
            "id": "topic_sub_koerper_balance_006",
            "name": "Core Training"
          },
          {
            "id": "topic_sub_koerper_balance_007",
            "name": "Stretching Kurs"
          },
          {
            "id": "topic_sub_koerper_balance_008",
            "name": "Balance Training"
          }
        ]
      }
    ]
  },
  {
    "id": "cat_kreativitaet_hobbys",
    "name": "Kreativität & Hobbys",
    "subcategories": [
      {
        "id": "sub_malen_zeichnen_kunst",
        "name": "Malen, Zeichnen & Kunst",
        "topics": [
          {
            "id": "topic_sub_malen_zeichnen_kunst_001",
            "name": "Malen lernen"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_002",
            "name": "Zeichnen lernen"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_003",
            "name": "Aquarell malen"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_004",
            "name": "Acrylmalerei"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_005",
            "name": "Ölmalerei"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_006",
            "name": "Skizzieren lernen"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_007",
            "name": "Porträt zeichnen"
          },
          {
            "id": "topic_sub_malen_zeichnen_kunst_008",
            "name": "Kunst für Anfänger"
          }
        ]
      },
      {
        "id": "sub_musik_instrumente",
        "name": "Musik & Instrumente",
        "topics": [
          {
            "id": "topic_sub_musik_instrumente_001",
            "name": "Gitarre lernen"
          },
          {
            "id": "topic_sub_musik_instrumente_002",
            "name": "Klavier lernen"
          },
          {
            "id": "topic_sub_musik_instrumente_003",
            "name": "Gesangsunterricht"
          },
          {
            "id": "topic_sub_musik_instrumente_004",
            "name": "Schlagzeug lernen"
          },
          {
            "id": "topic_sub_musik_instrumente_005",
            "name": "DJ Kurs"
          },
          {
            "id": "topic_sub_musik_instrumente_006",
            "name": "Musikproduktion"
          },
          {
            "id": "topic_sub_musik_instrumente_007",
            "name": "Songwriting"
          },
          {
            "id": "topic_sub_musik_instrumente_008",
            "name": "Tontechnik"
          }
        ]
      },
      {
        "id": "sub_fotografie_bildbearbeitung",
        "name": "Fotografie & Bildbearbeitung",
        "topics": [
          {
            "id": "topic_sub_fotografie_bildbearbeitung_001",
            "name": "Porträtfotografie"
          },
          {
            "id": "topic_sub_fotografie_bildbearbeitung_002",
            "name": "Landschaftsfotografie"
          },
          {
            "id": "topic_sub_fotografie_bildbearbeitung_003",
            "name": "Smartphone Fotografie"
          },
          {
            "id": "topic_sub_fotografie_bildbearbeitung_004",
            "name": "Bildbearbeitung (Photoshop...)"
          },
          {
            "id": "topic_sub_fotografie_bildbearbeitung_005",
            "name": "Lightroom Kurs"
          },
          {
            "id": "topic_sub_fotografie_bildbearbeitung_006",
            "name": "Studiofotografie"
          },
          {
            "id": "topic_sub_fotografie_bildbearbeitung_007",
            "name": "Kreative Fotografie"
          }
        ]
      },
      {
        "id": "sub_video_content_creation",
        "name": "Video & Content Creation",
        "topics": [
          {
            "id": "topic_sub_video_content_creation_001",
            "name": "YouTube Videos erstellen"
          },
          {
            "id": "topic_sub_video_content_creation_002",
            "name": "Social Media Content"
          },
          {
            "id": "topic_sub_video_content_creation_003",
            "name": "Storytelling Video"
          },
          {
            "id": "topic_sub_video_content_creation_004",
            "name": "Kamera Grundlagen"
          },
          {
            "id": "topic_sub_video_content_creation_005",
            "name": "Kurzfilm erstellen"
          },
          {
            "id": "topic_sub_video_content_creation_006",
            "name": "Reel & TikTok Produktion"
          },
          {
            "id": "topic_sub_video_content_creation_007",
            "name": "Videoproduktion"
          }
        ]
      },
      {
        "id": "sub_handarbeit_diy",
        "name": "Handarbeit & DIY",
        "topics": [
          {
            "id": "topic_sub_handarbeit_diy_001",
            "name": "Nähen lernen"
          },
          {
            "id": "topic_sub_handarbeit_diy_002",
            "name": "Stricken lernen"
          },
          {
            "id": "topic_sub_handarbeit_diy_003",
            "name": "Häkeln lernen"
          },
          {
            "id": "topic_sub_handarbeit_diy_004",
            "name": "Upcycling Workshop"
          },
          {
            "id": "topic_sub_handarbeit_diy_005",
            "name": "Makramee Kurs"
          },
          {
            "id": "topic_sub_handarbeit_diy_006",
            "name": "Basteln"
          },
          {
            "id": "topic_sub_handarbeit_diy_007",
            "name": "Schmuck selber machen"
          }
        ]
      },
      {
        "id": "sub_toepfern_kreatives_gestalten",
        "name": "Töpfern & kreatives Gestalten",
        "topics": [
          {
            "id": "topic_sub_toepfern_kreatives_gestalten_001",
            "name": "Töpfern lernen"
          },
          {
            "id": "topic_sub_toepfern_kreatives_gestalten_002",
            "name": "Keramik Workshop"
          },
          {
            "id": "topic_sub_toepfern_kreatives_gestalten_003",
            "name": "Modellieren"
          },
          {
            "id": "topic_sub_toepfern_kreatives_gestalten_004",
            "name": "Skulpturen gestalten"
          },
          {
            "id": "topic_sub_toepfern_kreatives_gestalten_005",
            "name": "Arbeiten mit Ton"
          },
          {
            "id": "topic_sub_toepfern_kreatives_gestalten_006",
            "name": "Glas gestalten"
          }
        ]
      },
      {
        "id": "sub_schreiben_kreative_texte",
        "name": "Schreiben & kreative Texte",
        "topics": [
          {
            "id": "topic_sub_schreiben_kreative_texte_001",
            "name": "Kreatives Schreiben"
          },
          {
            "id": "topic_sub_schreiben_kreative_texte_002",
            "name": "Storytelling lernen"
          },
          {
            "id": "topic_sub_schreiben_kreative_texte_003",
            "name": "Blog schreiben"
          },
          {
            "id": "topic_sub_schreiben_kreative_texte_004",
            "name": "Copywriting"
          },
          {
            "id": "topic_sub_schreiben_kreative_texte_005",
            "name": "Gedichte schreiben"
          },
          {
            "id": "topic_sub_schreiben_kreative_texte_006",
            "name": "Buch schreiben"
          },
          {
            "id": "topic_sub_schreiben_kreative_texte_007",
            "name": "Journaling"
          },
          {
            "id": "topic_sub_schreiben_kreative_texte_008",
            "name": "Schreibwerkstatt"
          }
        ]
      },
      {
        "id": "sub_schauspiel_performance",
        "name": "Schauspiel & Performance",
        "topics": [
          {
            "id": "topic_sub_schauspiel_performance_001",
            "name": "Schauspielkurs"
          },
          {
            "id": "topic_sub_schauspiel_performance_002",
            "name": "Improvisationstheater"
          },
          {
            "id": "topic_sub_schauspiel_performance_003",
            "name": "Bühnenperformance"
          },
          {
            "id": "topic_sub_schauspiel_performance_004",
            "name": "Körpersprache Training"
          },
          {
            "id": "topic_sub_schauspiel_performance_005",
            "name": "Präsentation mit Wirkung"
          },
          {
            "id": "topic_sub_schauspiel_performance_006",
            "name": "Sprechen vor Publikum"
          },
          {
            "id": "topic_sub_schauspiel_performance_007",
            "name": "Ausdruck & Stimme"
          }
        ]
      }
    ]
  },
  {
    "id": "cat_karriere_business",
    "name": "Karriere & Business",
    "subcategories": [
      {
        "id": "sub_finanzen_controlling_recht",
        "name": "Finanzen, Controlling & Recht",
        "topics": [
          {
            "id": "topic_sub_finanzen_controlling_recht_001",
            "name": "Buchhaltung lernen"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_002",
            "name": "Controlling"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_003",
            "name": "Kostenrechnung"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_004",
            "name": "Steuern"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_005",
            "name": "Unternehmensfinanzen"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_006",
            "name": "Wirtschaftsrecht"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_007",
            "name": "Compliance"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_008",
            "name": "Rechnungswesen"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_009",
            "name": "Lohnverrechnung"
          },
          {
            "id": "topic_sub_finanzen_controlling_recht_010",
            "name": "Fußball"
          }
        ]
      },
      {
        "id": "sub_fuehrung_management",
        "name": "Führung & Management",
        "topics": [
          {
            "id": "topic_sub_fuehrung_management_001",
            "name": "Leadership Training"
          },
          {
            "id": "topic_sub_fuehrung_management_002",
            "name": "Mitarbeiter führen lernen"
          },
          {
            "id": "topic_sub_fuehrung_management_003",
            "name": "Teammanagement"
          },
          {
            "id": "topic_sub_fuehrung_management_004",
            "name": "Motivation im Team"
          },
          {
            "id": "topic_sub_fuehrung_management_005",
            "name": "Konfliktmanagement Führung"
          },
          {
            "id": "topic_sub_fuehrung_management_006",
            "name": "Mitarbeitergespräche führen"
          },
          {
            "id": "topic_sub_fuehrung_management_007",
            "name": "Change Management"
          }
        ]
      },
      {
        "id": "sub_selbststaendigkeit_gruenden",
        "name": "Selbstständigkeit & Gründen",
        "topics": [
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_001",
            "name": "Selbstständig machen"
          },
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_002",
            "name": "Businessplan erstellen"
          },
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_003",
            "name": "Firma gründen"
          },
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_004",
            "name": "Online Business starten"
          },
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_005",
            "name": "Nebenberuflich selbstständig"
          },
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_006",
            "name": "Geschäftsmodell entwickeln"
          },
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_007",
            "name": "Startup Grundlagen"
          },
          {
            "id": "topic_sub_selbststaendigkeit_gruenden_008",
            "name": "Unternehmertum lernen"
          }
        ]
      },
      {
        "id": "sub_investieren_vermoegensaufbau",
        "name": "Investieren & Vermögensaufbau",
        "topics": [
          {
            "id": "topic_sub_investieren_vermoegensaufbau_001",
            "name": "Investieren lernen"
          },
          {
            "id": "topic_sub_investieren_vermoegensaufbau_002",
            "name": "Aktien Grundlagen"
          },
          {
            "id": "topic_sub_investieren_vermoegensaufbau_003",
            "name": "Immobilien investieren"
          },
          {
            "id": "topic_sub_investieren_vermoegensaufbau_004",
            "name": "Vermögensaufbau"
          },
          {
            "id": "topic_sub_investieren_vermoegensaufbau_005",
            "name": "Trading"
          },
          {
            "id": "topic_sub_investieren_vermoegensaufbau_006",
            "name": "Kryptowährungen"
          },
          {
            "id": "topic_sub_investieren_vermoegensaufbau_007",
            "name": "ETFs verstehen"
          }
        ]
      },
      {
        "id": "sub_marketing_vertrieb",
        "name": "Marketing & Vertrieb",
        "topics": [
          {
            "id": "topic_sub_marketing_vertrieb_001",
            "name": "Verkaufstraining"
          },
          {
            "id": "topic_sub_marketing_vertrieb_002",
            "name": "Sales Strategien"
          },
          {
            "id": "topic_sub_marketing_vertrieb_003",
            "name": "Kunden gewinnen"
          },
          {
            "id": "topic_sub_marketing_vertrieb_004",
            "name": "Online Marketing"
          }
        ]
      },
      {
        "id": "sub_kommunikation_verhandeln",
        "name": "Kommunikation & Verhandeln",
        "topics": [
          {
            "id": "topic_sub_kommunikation_verhandeln_001",
            "name": "Präsentationstraining"
          },
          {
            "id": "topic_sub_kommunikation_verhandeln_002",
            "name": "Gesprächsführung"
          },
          {
            "id": "topic_sub_kommunikation_verhandeln_003",
            "name": "Konflikte lösen"
          },
          {
            "id": "topic_sub_kommunikation_verhandeln_004",
            "name": "Überzeugend argumentieren"
          },
          {
            "id": "topic_sub_kommunikation_verhandeln_005",
            "name": "Pitch Training"
          }
        ]
      },
      {
        "id": "sub_produktivitaet_organisation",
        "name": "Produktivität & Organisation",
        "topics": [
          {
            "id": "topic_sub_produktivitaet_organisation_001",
            "name": "Selbstorganisation"
          },
          {
            "id": "topic_sub_produktivitaet_organisation_002",
            "name": "Effizienz steigern"
          },
          {
            "id": "topic_sub_produktivitaet_organisation_003",
            "name": "Prioritäten setzen"
          },
          {
            "id": "topic_sub_produktivitaet_organisation_004",
            "name": "Arbeitsmethoden"
          },
          {
            "id": "topic_sub_produktivitaet_organisation_005",
            "name": "Planung & Struktur"
          },
          {
            "id": "topic_sub_produktivitaet_organisation_006",
            "name": "Ziele erreichen"
          }
        ]
      },
      {
        "id": "sub_bewerbung_karriereplanung",
        "name": "Bewerbung & Karriereplanung",
        "topics": [
          {
            "id": "topic_sub_bewerbung_karriereplanung_001",
            "name": "Bewerbung schreiben"
          },
          {
            "id": "topic_sub_bewerbung_karriereplanung_002",
            "name": "Lebenslauf erstellen"
          },
          {
            "id": "topic_sub_bewerbung_karriereplanung_003",
            "name": "Vorstellungsgespräch Training"
          },
          {
            "id": "topic_sub_bewerbung_karriereplanung_004",
            "name": "Karriereplanung"
          },
          {
            "id": "topic_sub_bewerbung_karriereplanung_005",
            "name": "Jobwechsel vorbereiten"
          },
          {
            "id": "topic_sub_bewerbung_karriereplanung_006",
            "name": "Gehalt verhandeln"
          },
          {
            "id": "topic_sub_bewerbung_karriereplanung_007",
            "name": "Berufliche Neuorientierung"
          }
        ]
      },
      {
        "id": "sub_digitale_business_skills",
        "name": "Digitale Business Skills",
        "topics": [
          {
            "id": "topic_sub_digitale_business_skills_001",
            "name": "PowerPoint"
          },
          {
            "id": "topic_sub_digitale_business_skills_002",
            "name": "Projektmanagement Tools"
          },
          {
            "id": "topic_sub_digitale_business_skills_003",
            "name": "CRM Systeme"
          },
          {
            "id": "topic_sub_digitale_business_skills_004",
            "name": "Datenanalyse"
          },
          {
            "id": "topic_sub_digitale_business_skills_005",
            "name": "Automatisierung"
          },
          {
            "id": "topic_sub_digitale_business_skills_006",
            "name": "KI im Business"
          },
          {
            "id": "topic_sub_digitale_business_skills_007",
            "name": "Digitale Tools"
          }
        ]
      }
    ]
  },
  {
    "id": "cat_sport_bewegung",
    "name": "Sport & Bewegung",
    "subcategories": [
      {
        "id": "sub_ballsport_teamsport",
        "name": "Ballsport & Teamsport",
        "topics": [
          {
            "id": "topic_sub_ballsport_teamsport_001",
            "name": "Basketball"
          },
          {
            "id": "topic_sub_ballsport_teamsport_002",
            "name": "Volleyball"
          },
          {
            "id": "topic_sub_ballsport_teamsport_003",
            "name": "Tennis"
          },
          {
            "id": "topic_sub_ballsport_teamsport_004",
            "name": "Badminton"
          },
          {
            "id": "topic_sub_ballsport_teamsport_005",
            "name": "Tischtennis"
          },
          {
            "id": "topic_sub_ballsport_teamsport_006",
            "name": "Padel"
          }
        ]
      },
      {
        "id": "sub_wassersport",
        "name": "Wassersport",
        "topics": [
          {
            "id": "topic_sub_wassersport_001",
            "name": "Surfen"
          },
          {
            "id": "topic_sub_wassersport_002",
            "name": "Stand Up Paddling (SUP)"
          },
          {
            "id": "topic_sub_wassersport_003",
            "name": "Segeln"
          },
          {
            "id": "topic_sub_wassersport_004",
            "name": "Tauchen"
          },
          {
            "id": "topic_sub_wassersport_005",
            "name": "Kajak / Kanufahren"
          },
          {
            "id": "topic_sub_wassersport_006",
            "name": "Windsurfen"
          }
        ]
      },
      {
        "id": "sub_wintersport",
        "name": "Wintersport",
        "topics": [
          {
            "id": "topic_sub_wintersport_001",
            "name": "Skifahren"
          },
          {
            "id": "topic_sub_wintersport_002",
            "name": "Snowboarden"
          },
          {
            "id": "topic_sub_wintersport_003",
            "name": "Langlaufen"
          },
          {
            "id": "topic_sub_wintersport_004",
            "name": "Eislaufen"
          },
          {
            "id": "topic_sub_wintersport_005",
            "name": "Skitouren"
          }
        ]
      },
      {
        "id": "sub_outdoor_bergsport",
        "name": "Outdoor & Bergsport",
        "topics": [
          {
            "id": "topic_sub_outdoor_bergsport_001",
            "name": "Klettern / Bouldern"
          },
          {
            "id": "topic_sub_outdoor_bergsport_002",
            "name": "Mountainbiken"
          },
          {
            "id": "topic_sub_outdoor_bergsport_003",
            "name": "Trailrunning"
          },
          {
            "id": "topic_sub_outdoor_bergsport_004",
            "name": "Paragliding"
          }
        ]
      },
      {
        "id": "sub_kampfsport_selbstverteidigung",
        "name": "Kampfsport & Selbstverteidigung",
        "topics": [
          {
            "id": "topic_sub_kampfsport_selbstverteidigung_001",
            "name": "Boxen"
          },
          {
            "id": "topic_sub_kampfsport_selbstverteidigung_002",
            "name": "Kickboxen"
          },
          {
            "id": "topic_sub_kampfsport_selbstverteidigung_003",
            "name": "Judo"
          },
          {
            "id": "topic_sub_kampfsport_selbstverteidigung_004",
            "name": "Karate"
          },
          {
            "id": "topic_sub_kampfsport_selbstverteidigung_005",
            "name": "MMA"
          },
          {
            "id": "topic_sub_kampfsport_selbstverteidigung_006",
            "name": "Selbstverteidigung"
          }
        ]
      },
      {
        "id": "sub_trendsport_fun_sport",
        "name": "Trendsport & Fun-Sport",
        "topics": [
          {
            "id": "topic_sub_trendsport_fun_sport_001",
            "name": "Parkour"
          },
          {
            "id": "topic_sub_trendsport_fun_sport_002",
            "name": "Slackline"
          },
          {
            "id": "topic_sub_trendsport_fun_sport_003",
            "name": "Skateboard"
          },
          {
            "id": "topic_sub_trendsport_fun_sport_004",
            "name": "Longboard"
          },
          {
            "id": "topic_sub_trendsport_fun_sport_005",
            "name": "Trampolin"
          },
          {
            "id": "topic_sub_trendsport_fun_sport_006",
            "name": "Ninja Warrior Training"
          }
        ]
      },
      {
        "id": "sub_tanz_bewegungskurse",
        "name": "Tanz & Bewegungskurse",
        "topics": [
          {
            "id": "topic_sub_tanz_bewegungskurse_001",
            "name": "Salsa"
          },
          {
            "id": "topic_sub_tanz_bewegungskurse_002",
            "name": "Bachata"
          },
          {
            "id": "topic_sub_tanz_bewegungskurse_003",
            "name": "Hip-Hop"
          },
          {
            "id": "topic_sub_tanz_bewegungskurse_004",
            "name": "Standardtanz"
          },
          {
            "id": "topic_sub_tanz_bewegungskurse_005",
            "name": "Breakdance"
          }
        ]
      }
    ]
  }
]'::jsonb,
    true
  ),
  updated_at = now()
where id = 'main';

-- -------------------------------------------------------------
-- END FILE: supabase/seed_categories.sql
-- -------------------------------------------------------------

