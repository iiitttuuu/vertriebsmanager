-- =============================================================
-- BusinessOS / Vertriebsmanager - Safe Security Hardening
-- Erstellt: 2026-07-03
--
-- Zweck:
--   Schließt die kritischste bekannte RLS-Lücke in public.profiles,
--   ohne bestehende Profilbearbeitung zu blockieren.
--
-- WICHTIG:
--   1) Vorher ein Supabase-Backup erstellen.
--   2) Im Supabase SQL Editor separat ausführen, nicht in große Bundles kopieren.
--   3) Danach mit einem normalen Mitarbeiter-Login testen:
--      - Name/Telefon/Adresse ändern: soll funktionieren.
--      - Rolle/Status/E-Mail selbst ändern: muss fehlschlagen.
--
-- Was dieser Patch NICHT macht:
--   - Keine Änderung an app_state, providers oder invoices.
--   - Keine Datenmigration.
--   - Kein Löschen von Profilen oder Benutzern.
-- =============================================================

create or replace function public.prevent_profile_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- SQL Editor / Server-Service-Rollen nicht blockieren.
  -- Normale App-Zugriffe haben auth.uid() gesetzt und laufen durch die Prüfungen unten.
  if auth.uid() is null then
    return new;
  end if;

  -- Admins dürfen Rollen, Status und E-Mail weiterhin verwalten.
  if public.is_admin() then
    return new;
  end if;

  -- Nicht-Admins dürfen nur ihr eigenes Profil bearbeiten.
  if old.user_id::text is distinct from auth.uid()::text
     or new.user_id is distinct from old.user_id then
    raise exception 'Profil darf nur vom eigenen Benutzer bearbeitet werden.';
  end if;

  -- Kritische Felder gegen Self-Escalation schützen.
  if new.email is distinct from old.email
     or new.role is distinct from old.role
     or new.status is distinct from old.status
     or new.created_at is distinct from old.created_at then
    raise exception 'E-Mail, Rolle und Status duerfen nur von Admins geaendert werden.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_self_privilege_guard on public.profiles;
create trigger trg_profiles_self_privilege_guard
before update on public.profiles
for each row execute procedure public.prevent_profile_self_privilege_escalation();

-- Bestehende breite Update-Policies ersetzen.
drop policy if exists "profiles_update_self_or_admin" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

-- Mitarbeiter dürfen ihre ungefährlichen Profilfelder weiter selbst speichern.
-- Der Trigger verhindert Änderungen an Rolle, Status, E-Mail, user_id und created_at.
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (user_id::text = auth.uid()::text)
with check (user_id::text = auth.uid()::text);

-- Admins behalten die Mitarbeiterverwaltung.
create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Kontrollabfrage nach Ausführung:
-- select policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename = 'profiles'
-- order by policyname;

-- Notfall-Rollback:
-- drop trigger if exists trg_profiles_self_privilege_guard on public.profiles;
-- drop function if exists public.prevent_profile_self_privilege_escalation();
-- drop policy if exists "profiles_update_self" on public.profiles;
-- drop policy if exists "profiles_update_admin" on public.profiles;
-- create policy "profiles_update_self_or_admin"
-- on public.profiles
-- for update
-- to authenticated
-- using (user_id::text = auth.uid()::text or public.is_admin())
-- with check (user_id::text = auth.uid()::text or public.is_admin());
