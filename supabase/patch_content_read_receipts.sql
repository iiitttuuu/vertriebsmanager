-- Lesebestätigungen für Hilfe-Themen, Hilfe-Videos und persönliche Glocken-Nachrichten.
-- Im Supabase SQL Editor ausführen. Das Skript ist idempotent.

create extension if not exists pgcrypto;

create table if not exists public.content_read_receipts (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_id text not null,
  content_version integer not null default 1,
  reader_user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint content_read_receipts_type_check
    check (content_type in ('help_topic', 'help_video', 'employee_message')),
  constraint content_read_receipts_id_check
    check (char_length(content_id) between 1 and 180),
  constraint content_read_receipts_version_check
    check (content_version between 1 and 100000),
  constraint content_read_receipts_unique_reader
    unique (content_type, content_id, content_version, reader_user_id)
);

alter table public.content_read_receipts
  add column if not exists content_type text,
  add column if not exists content_id text,
  add column if not exists content_version integer not null default 1,
  add column if not exists reader_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists read_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_content_read_receipts_content
  on public.content_read_receipts (content_type, content_id, content_version, read_at desc);

create index if not exists idx_content_read_receipts_reader
  on public.content_read_receipts (reader_user_id, read_at desc);

alter table public.content_read_receipts enable row level security;

revoke all on public.content_read_receipts from public;
revoke all on public.content_read_receipts from anon;
grant select, insert on public.content_read_receipts to authenticated;

drop policy if exists "content_read_receipts_select_own_or_admin" on public.content_read_receipts;
create policy "content_read_receipts_select_own_or_admin"
on public.content_read_receipts
for select
to authenticated
using (
  reader_user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "content_read_receipts_insert_own_active" on public.content_read_receipts;
create policy "content_read_receipts_insert_own_active"
on public.content_read_receipts
for insert
to authenticated
with check (
  reader_user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.user_id::text = auth.uid()::text
      and p.status = 'active'
  )
);
