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
