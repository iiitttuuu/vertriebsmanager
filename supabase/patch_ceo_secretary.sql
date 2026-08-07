-- -------------------------------------------------------------
-- CEO Office / digitales Sekretariat
-- Privates Arbeitsgedaechtnis pro Superadmin: Notizen, Aufgaben,
-- Wiedervorlagen und Entscheidungen. Idempotent ausfuehrbar.
-- -------------------------------------------------------------

create extension if not exists pgcrypto;

-- Auch alte Superadmin-Profile (supaadmin) bleiben berechtigt.
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('superadmin', 'supaadmin'), false);
$$;

create table if not exists public.ceo_secretary_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null default 'note' check (entry_type in ('note', 'task', 'followup', 'decision', 'idea', 'knowledge')),
  title text not null default '',
  body text not null default '',
  context_label text not null default '',
  tags text[] not null default '{}',
  workspace_status text check (workspace_status in ('inbox', 'exploring', 'planned', 'trusted', 'review', 'archived')),
  due_date date,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_by_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ceo_secretary_entries
  add column if not exists entry_type text not null default 'note',
  add column if not exists title text not null default '',
  add column if not exists body text not null default '',
  add column if not exists context_label text not null default '',
  add column if not exists tags text[] not null default '{}',
  add column if not exists workspace_status text,
  add column if not exists due_date date,
  add column if not exists priority text not null default 'normal',
  add column if not exists is_completed boolean not null default false,
  add column if not exists completed_at timestamptz,
  add column if not exists created_by_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists created_by_name text not null default '',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table public.ceo_secretary_entries
  drop constraint if exists ceo_secretary_entries_entry_type_check;
alter table public.ceo_secretary_entries
  add constraint ceo_secretary_entries_entry_type_check
  check (entry_type in ('note', 'task', 'followup', 'decision', 'idea', 'knowledge'));

alter table public.ceo_secretary_entries
  drop constraint if exists ceo_secretary_entries_priority_check;
alter table public.ceo_secretary_entries
  add constraint ceo_secretary_entries_priority_check
  check (priority in ('low', 'normal', 'high', 'critical'));

alter table public.ceo_secretary_entries
  drop constraint if exists ceo_secretary_entries_workspace_status_check;
alter table public.ceo_secretary_entries
  add constraint ceo_secretary_entries_workspace_status_check
  check (workspace_status is null or workspace_status in ('inbox', 'exploring', 'planned', 'trusted', 'review', 'archived'));

create index if not exists idx_ceo_secretary_entries_owner_updated
  on public.ceo_secretary_entries (created_by_user_id, updated_at desc);

create index if not exists idx_ceo_secretary_entries_owner_open_due
  on public.ceo_secretary_entries (created_by_user_id, due_date)
  where is_completed = false;

create index if not exists idx_ceo_secretary_entries_owner_priority_due
  on public.ceo_secretary_entries (created_by_user_id, priority, due_date)
  where is_completed = false;

create index if not exists idx_ceo_secretary_entries_tags
  on public.ceo_secretary_entries using gin (tags);

drop trigger if exists trg_ceo_secretary_entries_updated_at on public.ceo_secretary_entries;
create trigger trg_ceo_secretary_entries_updated_at
before update on public.ceo_secretary_entries
for each row execute procedure public.set_updated_at();

alter table public.ceo_secretary_entries enable row level security;

grant select, insert, update, delete on public.ceo_secretary_entries to authenticated;

-- Jeder Superadmin sieht ausschließlich sein eigenes CEO Office.
drop policy if exists "ceo_secretary_entries_owner_select" on public.ceo_secretary_entries;
create policy "ceo_secretary_entries_owner_select"
on public.ceo_secretary_entries
for select
to authenticated
using (public.is_superadmin() and created_by_user_id = auth.uid());

create table if not exists public.ceo_secretary_preferences (
  owner_user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  assistant_name text not null default '',
  memory jsonb not null default '[]'::jsonb,
  last_briefing_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_ceo_secretary_preferences_updated_at on public.ceo_secretary_preferences;
create trigger trg_ceo_secretary_preferences_updated_at
before update on public.ceo_secretary_preferences
for each row execute procedure public.set_updated_at();

alter table public.ceo_secretary_preferences enable row level security;
grant select, insert, update, delete on public.ceo_secretary_preferences to authenticated;

drop policy if exists "ceo_secretary_preferences_owner_select" on public.ceo_secretary_preferences;
create policy "ceo_secretary_preferences_owner_select"
on public.ceo_secretary_preferences for select to authenticated
using (public.is_superadmin() and owner_user_id = auth.uid());

drop policy if exists "ceo_secretary_preferences_owner_insert" on public.ceo_secretary_preferences;
create policy "ceo_secretary_preferences_owner_insert"
on public.ceo_secretary_preferences for insert to authenticated
with check (public.is_superadmin() and owner_user_id = auth.uid());

drop policy if exists "ceo_secretary_preferences_owner_update" on public.ceo_secretary_preferences;
create policy "ceo_secretary_preferences_owner_update"
on public.ceo_secretary_preferences for update to authenticated
using (public.is_superadmin() and owner_user_id = auth.uid())
with check (public.is_superadmin() and owner_user_id = auth.uid());

drop policy if exists "ceo_secretary_preferences_owner_delete" on public.ceo_secretary_preferences;
create policy "ceo_secretary_preferences_owner_delete"
on public.ceo_secretary_preferences for delete to authenticated
using (public.is_superadmin() and owner_user_id = auth.uid());

-- Verknuepft private CEO-Notizen mit CRM-Objekten. Es werden nur Typ,
-- ID und Anzeige gespeichert; CRM-Inhalte bleiben im jeweiligen Modul.
create table if not exists public.ceo_secretary_entry_links (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.ceo_secretary_entries(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('employee', 'company', 'provider')),
  entity_id text not null,
  entity_label text not null default '',
  created_at timestamptz not null default now(),
  unique (entry_id, entity_type, entity_id)
);

create index if not exists idx_ceo_secretary_entry_links_owner_entity
  on public.ceo_secretary_entry_links (owner_user_id, entity_type, entity_id);

create index if not exists idx_ceo_secretary_entry_links_entry
  on public.ceo_secretary_entry_links (entry_id);

alter table public.ceo_secretary_entry_links enable row level security;
grant select, insert, update, delete on public.ceo_secretary_entry_links to authenticated;

drop policy if exists "ceo_secretary_entry_links_owner_select" on public.ceo_secretary_entry_links;
create policy "ceo_secretary_entry_links_owner_select"
on public.ceo_secretary_entry_links for select to authenticated
using (public.is_superadmin() and owner_user_id = auth.uid());

drop policy if exists "ceo_secretary_entry_links_owner_insert" on public.ceo_secretary_entry_links;
create policy "ceo_secretary_entry_links_owner_insert"
on public.ceo_secretary_entry_links for insert to authenticated
with check (
  public.is_superadmin()
  and owner_user_id = auth.uid()
  and exists (
    select 1
    from public.ceo_secretary_entries entry
    where entry.id = entry_id
      and entry.created_by_user_id = auth.uid()
  )
);

drop policy if exists "ceo_secretary_entry_links_owner_update" on public.ceo_secretary_entry_links;
create policy "ceo_secretary_entry_links_owner_update"
on public.ceo_secretary_entry_links for update to authenticated
using (public.is_superadmin() and owner_user_id = auth.uid())
with check (
  public.is_superadmin()
  and owner_user_id = auth.uid()
  and exists (
    select 1
    from public.ceo_secretary_entries entry
    where entry.id = entry_id
      and entry.created_by_user_id = auth.uid()
  )
);

drop policy if exists "ceo_secretary_entry_links_owner_delete" on public.ceo_secretary_entry_links;
create policy "ceo_secretary_entry_links_owner_delete"
on public.ceo_secretary_entry_links for delete to authenticated
using (public.is_superadmin() and owner_user_id = auth.uid());

drop policy if exists "ceo_secretary_entries_owner_insert" on public.ceo_secretary_entries;
create policy "ceo_secretary_entries_owner_insert"
on public.ceo_secretary_entries
for insert
to authenticated
with check (public.is_superadmin() and created_by_user_id = auth.uid());

drop policy if exists "ceo_secretary_entries_owner_update" on public.ceo_secretary_entries;
create policy "ceo_secretary_entries_owner_update"
on public.ceo_secretary_entries
for update
to authenticated
using (public.is_superadmin() and created_by_user_id = auth.uid())
with check (public.is_superadmin() and created_by_user_id = auth.uid());

drop policy if exists "ceo_secretary_entries_owner_delete" on public.ceo_secretary_entries;
create policy "ceo_secretary_entries_owner_delete"
on public.ceo_secretary_entries
for delete
to authenticated
using (public.is_superadmin() and created_by_user_id = auth.uid());

-- -------------------------------------------------------------
-- END FILE: supabase/patch_ceo_secretary.sql
-- -------------------------------------------------------------
