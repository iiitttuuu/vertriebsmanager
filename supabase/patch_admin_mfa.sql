-- Erweiterung der verpflichtenden TOTP-MFA auf Admins.
-- Im Supabase SQL Editor ausfuehren, nachdem patch_superadmin_mfa.sql bereits aktiv ist.
-- Idempotent: kann gefahrlos erneut ausgefuehrt werden.

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
    public.current_user_role() in ('admin', 'superadmin', 'supaadmin')
    and public.superadmin_mfa_verified(),
    false
  );
$$;

commit;
