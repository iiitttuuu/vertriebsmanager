-- Sub-Themen je Hauptthema
-- Einmal im Supabase SQL Editor ausführen. Das Skript ist idempotent.

create extension if not exists pgcrypto;

create table if not exists public.topic_subtopics (
  id uuid primary key default gen_random_uuid(),
  topic_id text not null check (char_length(trim(topic_id)) > 0),
  name text not null check (char_length(trim(name)) between 1 and 120),
  normalized_name text not null check (char_length(trim(normalized_name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (topic_id, normalized_name)
);

create index if not exists idx_topic_subtopics_topic_id
  on public.topic_subtopics (topic_id);

create or replace function public.set_topic_subtopics_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_topic_subtopics_updated_at on public.topic_subtopics;
create trigger trg_topic_subtopics_updated_at
before update on public.topic_subtopics
for each row execute procedure public.set_topic_subtopics_updated_at();

alter table public.topic_subtopics enable row level security;

-- Jeder aktive Account darf Sub-Themen für die Suche lesen.
drop policy if exists "topic_subtopics_active_select" on public.topic_subtopics;
create policy "topic_subtopics_active_select"
on public.topic_subtopics for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id::text = auth.uid()::text and p.status = 'active'
  )
);

-- Pflege der Stammdaten bleibt ausschließlich Admins vorbehalten.
drop policy if exists "topic_subtopics_admin_insert" on public.topic_subtopics;
create policy "topic_subtopics_admin_insert"
on public.topic_subtopics for insert to authenticated
with check (public.is_admin());

drop policy if exists "topic_subtopics_admin_update" on public.topic_subtopics;
create policy "topic_subtopics_admin_update"
on public.topic_subtopics for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "topic_subtopics_admin_delete" on public.topic_subtopics;
create policy "topic_subtopics_admin_delete"
on public.topic_subtopics for delete to authenticated
using (public.is_admin());
