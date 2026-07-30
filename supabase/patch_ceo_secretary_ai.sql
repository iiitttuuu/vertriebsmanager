-- -------------------------------------------------------------
-- CEO Office – intelligenter Sekretär
-- Erweitert das private CEO Office um Prioritäten und einen
-- persistenten, pro Superadmin getrennten Lernspeicher.
-- -------------------------------------------------------------

alter table public.ceo_secretary_entries
  add column if not exists priority text not null default 'normal';

alter table public.ceo_secretary_entries
  drop constraint if exists ceo_secretary_entries_priority_check;
alter table public.ceo_secretary_entries
  add constraint ceo_secretary_entries_priority_check
  check (priority in ('low', 'normal', 'high', 'critical'));

create index if not exists idx_ceo_secretary_entries_owner_priority_due
  on public.ceo_secretary_entries (created_by_user_id, priority, due_date)
  where is_completed = false;

create table if not exists public.ceo_secretary_preferences (
  owner_user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  assistant_name text not null default '',
  memory jsonb not null default '[]'::jsonb,
  last_briefing_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ceo_secretary_preferences
  add column if not exists assistant_name text not null default '',
  add column if not exists memory jsonb not null default '[]'::jsonb,
  add column if not exists last_briefing_at timestamptz,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_ceo_secretary_preferences_updated_at on public.ceo_secretary_preferences;
create trigger trg_ceo_secretary_preferences_updated_at
before update on public.ceo_secretary_preferences
for each row execute procedure public.set_updated_at();

alter table public.ceo_secretary_preferences enable row level security;

grant select, insert, update, delete on public.ceo_secretary_preferences to authenticated;

drop policy if exists "ceo_secretary_preferences_owner_select" on public.ceo_secretary_preferences;
create policy "ceo_secretary_preferences_owner_select"
on public.ceo_secretary_preferences
for select
to authenticated
using (public.is_superadmin() and owner_user_id = auth.uid());

drop policy if exists "ceo_secretary_preferences_owner_insert" on public.ceo_secretary_preferences;
create policy "ceo_secretary_preferences_owner_insert"
on public.ceo_secretary_preferences
for insert
to authenticated
with check (public.is_superadmin() and owner_user_id = auth.uid());

drop policy if exists "ceo_secretary_preferences_owner_update" on public.ceo_secretary_preferences;
create policy "ceo_secretary_preferences_owner_update"
on public.ceo_secretary_preferences
for update
to authenticated
using (public.is_superadmin() and owner_user_id = auth.uid())
with check (public.is_superadmin() and owner_user_id = auth.uid());

drop policy if exists "ceo_secretary_preferences_owner_delete" on public.ceo_secretary_preferences;
create policy "ceo_secretary_preferences_owner_delete"
on public.ceo_secretary_preferences
for delete
to authenticated
using (public.is_superadmin() and owner_user_id = auth.uid());

-- -------------------------------------------------------------
-- END FILE: supabase/patch_ceo_secretary_ai.sql
-- -------------------------------------------------------------
