-- Entschaerft Timeouts/rekursive Auswertung bei public.profiles RLS.
-- Ziel: Login-Profilabfrage darf immer das eigene Profil lesen; Admin-Lesen laeuft
-- ueber eine SECURITY-DEFINER-Funktion ohne Policy-Rekursion.

create or replace function public.current_user_role()
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  resolved_role text;
begin
  select p.role
  into resolved_role
  from public.profiles p
  where p.user_id = auth.uid()
    and p.status = 'active'
  limit 1;

  return resolved_role;
end;
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

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
drop policy if exists "profiles_select_self" on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;

create policy "profiles_select_self"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

create policy "profiles_select_admin"
on public.profiles
for select
to authenticated
using (public.is_admin());

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "profiles_update_admin" on public.profiles;

create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
