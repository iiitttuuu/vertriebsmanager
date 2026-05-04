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
