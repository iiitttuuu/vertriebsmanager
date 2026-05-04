-- Provider-Notizen Tabelle + RLS
-- Im Supabase SQL Editor ausfuehren.
-- Idempotent: kann mehrfach ausgefuehrt werden.

create extension if not exists pgcrypto;

create table if not exists public.provider_notes (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null,
  note_text text not null default '',
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_by_name text not null default '',
  created_by_role text not null default 'mitarbeiter',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_provider_notes_provider_id
  on public.provider_notes (provider_id);

create index if not exists idx_provider_notes_created_by_user_id
  on public.provider_notes (created_by_user_id);

create index if not exists idx_provider_notes_provider_created_at
  on public.provider_notes (provider_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_provider_notes_updated_at on public.provider_notes;
create trigger trg_provider_notes_updated_at
before update on public.provider_notes
for each row execute procedure public.set_updated_at();

alter table public.provider_notes enable row level security;

-- Nur aktive Accounts duerfen arbeiten
drop policy if exists "provider_notes_active_select" on public.provider_notes;
create policy "provider_notes_active_select"
on public.provider_notes
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

-- Insert nur fuer eigene User-ID
drop policy if exists "provider_notes_active_insert_own" on public.provider_notes;
create policy "provider_notes_active_insert_own"
on public.provider_notes
for insert
to authenticated
with check (
  created_by_user_id::text = auth.uid()::text
  and exists (
    select 1
    from public.profiles p
    where p.user_id::text = auth.uid()::text
      and p.status = 'active'
  )
);

-- Update/Delete nur fuer eigene Notizen
drop policy if exists "provider_notes_active_update_own" on public.provider_notes;
create policy "provider_notes_active_update_own"
on public.provider_notes
for update
to authenticated
using (
  created_by_user_id::text = auth.uid()::text
  and exists (
    select 1
    from public.profiles p
    where p.user_id::text = auth.uid()::text
      and p.status = 'active'
  )
)
with check (
  created_by_user_id::text = auth.uid()::text
  and exists (
    select 1
    from public.profiles p
    where p.user_id::text = auth.uid()::text
      and p.status = 'active'
  )
);

drop policy if exists "provider_notes_active_delete_own" on public.provider_notes;
create policy "provider_notes_active_delete_own"
on public.provider_notes
for delete
to authenticated
using (
  created_by_user_id::text = auth.uid()::text
  and exists (
    select 1
    from public.profiles p
    where p.user_id::text = auth.uid()::text
      and p.status = 'active'
  )
);
