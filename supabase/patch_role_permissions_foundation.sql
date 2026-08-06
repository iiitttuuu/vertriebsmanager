-- Rollen- und Rechteverwaltung: sichere Grundlage.
-- Erst ausführen, wenn patch_superadmin_mfa.sql aktiv ist.
-- Dieser Patch legt ausschließlich Katalog, Overrides und Audit an. Er erweitert
-- keine Rechte, solange die jeweiligen Daten-Policies nicht angebunden wurden.

begin;

create table if not exists public.permission_catalog (
  permission_key text primary key check (permission_key ~ '^[a-z0-9][a-z0-9._:-]{2,120}$'),
  section_id text not null default '',
  label text not null,
  scope text not null check (scope in ('page', 'read', 'create', 'update', 'delete')),
  sensitivity text not null default 'standard' check (sensitivity in ('standard', 'confidential', 'critical')),
  is_assignable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_user_id uuid references auth.users(id) on delete set null
);

create table if not exists public.role_permission_overrides (
  role text not null check (role in ('mitarbeiter', 'vertriebsmitarbeiter', 'admin', 'superadmin', 'supaadmin')),
  permission_key text not null references public.permission_catalog(permission_key) on delete cascade,
  effect text not null check (effect in ('allow', 'deny')),
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id) on delete set null,
  primary key (role, permission_key)
);

create table if not exists public.role_permission_audit (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  permission_key text not null,
  previous_effect text,
  next_effect text,
  changed_at timestamptz not null default now(),
  changed_by_user_id uuid references auth.users(id) on delete set null
);

alter table public.permission_catalog enable row level security;
alter table public.role_permission_overrides enable row level security;
alter table public.role_permission_audit enable row level security;

drop policy if exists "permission_catalog_active_read" on public.permission_catalog;
create policy "permission_catalog_active_read"
on public.permission_catalog for select to authenticated
using (public.current_user_role() is not null);

drop policy if exists "role_permission_overrides_active_read" on public.role_permission_overrides;
create policy "role_permission_overrides_active_read"
on public.role_permission_overrides for select to authenticated
using (public.current_user_role() is not null);

drop policy if exists "role_permission_audit_superadmin_read" on public.role_permission_audit;
create policy "role_permission_audit_superadmin_read"
on public.role_permission_audit for select to authenticated
using (public.is_superadmin());

-- Änderungen erfolgen ausschließlich über die Funktion unten. Dadurch entstehen
-- immer ein Audit-Eintrag und eine AAL2-geprüfte Superadmin-Autorisierung.
revoke insert, update, delete on public.permission_catalog from authenticated;
revoke insert, update, delete on public.role_permission_overrides from authenticated;
revoke insert, update, delete on public.role_permission_audit from authenticated;

create or replace function public.set_role_permission_override(
  target_role text,
  target_permission_key text,
  next_effect text
)
returns public.role_permission_overrides
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_role text := lower(trim(coalesce(target_role, '')));
  normalized_key text := lower(trim(coalesce(target_permission_key, '')));
  normalized_effect text := lower(trim(coalesce(next_effect, '')));
  catalog_row public.permission_catalog%rowtype;
  previous_effect text;
  saved_row public.role_permission_overrides%rowtype;
begin
  if not public.is_superadmin() then
    raise exception using errcode = '42501', message = 'Nur Superadmins mit bestätigtem Authenticator dürfen Rechte ändern.';
  end if;
  if normalized_role not in ('mitarbeiter', 'vertriebsmitarbeiter', 'admin', 'superadmin', 'supaadmin') then
    raise exception using errcode = '22023', message = 'Ungültige Rolle.';
  end if;
  if normalized_effect not in ('allow', 'deny') then
    raise exception using errcode = '22023', message = 'Ungültige Rechtewirkung.';
  end if;

  select * into catalog_row
  from public.permission_catalog
  where permission_key = normalized_key;
  if not found or not catalog_row.is_assignable then
    raise exception using errcode = '22023', message = 'Diese Berechtigung darf nicht geändert werden.';
  end if;
  if normalized_role in ('superadmin', 'supaadmin') and catalog_row.sensitivity = 'critical' and normalized_effect = 'deny' then
    raise exception using errcode = '22023', message = 'Kritische Superadmin-Berechtigungen dürfen nicht entzogen werden.';
  end if;

  select effect into previous_effect
  from public.role_permission_overrides
  where role = normalized_role and permission_key = normalized_key;

  insert into public.role_permission_overrides (role, permission_key, effect, updated_at, updated_by_user_id)
  values (normalized_role, normalized_key, normalized_effect, now(), auth.uid())
  on conflict (role, permission_key) do update
  set effect = excluded.effect,
      updated_at = excluded.updated_at,
      updated_by_user_id = excluded.updated_by_user_id
  returning * into saved_row;

  insert into public.role_permission_audit (role, permission_key, previous_effect, next_effect, changed_by_user_id)
  values (normalized_role, normalized_key, previous_effect, normalized_effect, auth.uid());

  return saved_row;
end;
$$;

grant select on public.permission_catalog, public.role_permission_overrides to authenticated;
grant select on public.role_permission_audit to authenticated;
grant execute on function public.set_role_permission_override(text, text, text) to authenticated;

create or replace function public.register_page_permission_catalog(entries jsonb)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  entry jsonb;
  permission_key_value text;
  section_id_value text;
  label_value text;
  critical_section boolean;
begin
  if not public.is_superadmin() then
    raise exception using errcode = '42501', message = 'Nur Superadmins mit bestätigtem Authenticator dürfen den Berechtigungskatalog aktualisieren.';
  end if;
  if jsonb_typeof(entries) <> 'array' then
    raise exception using errcode = '22023', message = 'Ungültiger Berechtigungskatalog.';
  end if;
  for entry in select value from jsonb_array_elements(entries)
  loop
    permission_key_value := lower(trim(coalesce(entry ->> 'permission_key', '')));
    section_id_value := trim(coalesce(entry ->> 'section_id', ''));
    label_value := trim(coalesce(entry ->> 'label', ''));
    critical_section := section_id_value in ('roles-rights-section', 'my-account-section');
    if permission_key_value !~ '^page:[a-z0-9][a-z0-9._:-]{2,120}$' or section_id_value = '' or label_value = '' then
      raise exception using errcode = '22023', message = 'Ungültiger Seitenberechtigungseintrag.';
    end if;
    insert into public.permission_catalog (permission_key, section_id, label, scope, sensitivity, is_assignable, created_by_user_id, updated_by_user_id)
    values (
      permission_key_value,
      section_id_value,
      label_value,
      'page',
      case when critical_section then 'critical' else 'standard' end,
      not critical_section,
      auth.uid(),
      auth.uid()
    )
    on conflict (permission_key) do update
    set section_id = excluded.section_id,
        label = excluded.label,
        updated_at = now(),
        updated_by_user_id = auth.uid();
  end loop;
end;
$$;

grant execute on function public.register_page_permission_catalog(jsonb) to authenticated;

commit;
