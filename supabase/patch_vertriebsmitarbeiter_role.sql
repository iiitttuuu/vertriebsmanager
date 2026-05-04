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
