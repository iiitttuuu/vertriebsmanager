-- Verpflichtende TOTP-MFA für Superadmins.
-- Nach allen bestehenden Rollen-/RLS-Patches im Supabase SQL Editor ausführen.
-- Die Weboberfläche leitet Superadmins per QR-Code durch die Einrichtung.

begin;

create or replace function public.superadmin_mfa_verified()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false);
$$;

-- Superadmins erhalten ihre erweiterten Rechte nur mit einer AAL2-Session
-- (Authenticator-App erfolgreich bestätigt). Normale Admins bleiben unverändert.
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    public.current_user_role() in ('superadmin', 'supaadmin')
    and public.superadmin_mfa_verified(),
    false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    public.current_user_role() = 'admin'
    or (
      public.current_user_role() in ('superadmin', 'supaadmin')
      and public.superadmin_mfa_verified()
    ),
    false
  );
$$;

commit;
