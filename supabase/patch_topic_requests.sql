-- Kategorieanfragen: eigene, auswertbare Supabase-Tabelle
-- Im Supabase SQL Editor einmal ausführen.
-- Enthält: Backfill aus dem bisherigen app_state-JSON, RLS und Historie.

create table if not exists public.topic_requests (
  id text primary key,
  topic text not null check (char_length(trim(topic)) between 1 and 120),
  note text not null default '' check (char_length(note) <= 400),
  provider_id text,
  provider_name text not null default '',
  requested_by_user_id uuid not null references auth.users(id) on delete restrict,
  requested_by_name text not null default '',
  requested_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'rejected')),
  resolved_topic_id text,
  resolved_topic_name text,
  resolved_by_user_id uuid references auth.users(id) on delete set null,
  resolved_by_name text not null default '',
  resolved_at timestamptz,
  resolution_note text not null default '' check (char_length(resolution_note) <= 400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_topic_requests_status_requested_at
  on public.topic_requests (status, requested_at desc);
create index if not exists idx_topic_requests_requested_by
  on public.topic_requests (requested_by_user_id, requested_at desc);

create or replace function public.set_topic_request_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_topic_requests_updated_at on public.topic_requests;
create trigger trg_topic_requests_updated_at
before update on public.topic_requests
for each row execute procedure public.set_topic_request_updated_at();

-- Einmalige Übernahme bereits gespeicherter Anfragen aus der bisherigen JSON-Struktur.
insert into public.topic_requests (
  id, topic, note, provider_name, requested_by_user_id, requested_by_name, requested_at, status, created_at, updated_at
)
select
  left(coalesce(entry->>'id', 'legacy_topic_request_' || md5(entry::text)), 180),
  left(coalesce(nullif(trim(entry->>'topic'), ''), 'Unbenannte Kategorie'), 120),
  left(coalesce(entry->>'note', ''), 400),
  left(coalesce(entry->>'providerName', ''), 180),
  (entry->>'requestedByUserId')::uuid,
  left(coalesce(entry->>'requestedByName', 'Mitarbeiter'), 180),
  coalesce(nullif(entry->>'createdAt', '')::timestamptz, now()),
  case when entry->>'status' in ('open', 'in_review', 'resolved', 'rejected') then entry->>'status' else 'open' end,
  coalesce(nullif(entry->>'createdAt', '')::timestamptz, now()),
  now()
from public.app_state state_row
cross join lateral jsonb_array_elements(coalesce(state_row.payload #> '{settings,topicRequests}', '[]'::jsonb)) entry
where state_row.id = 'main'
  and coalesce(entry->>'topic', '') <> ''
  and coalesce(entry->>'requestedByUserId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
on conflict (id) do nothing;

alter table public.topic_requests enable row level security;

-- Nur aktive Accounts sehen eigene Anfragen; Superadmins sehen sämtliche Anfragen.
drop policy if exists "topic_requests_select_own_or_superadmin" on public.topic_requests;
create policy "topic_requests_select_own_or_superadmin"
on public.topic_requests for select to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id::text = auth.uid()::text and p.status = 'active'
  )
  and (
    requested_by_user_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.user_id::text = auth.uid()::text and p.status = 'active' and lower(p.role) = 'superadmin'
    )
  )
);

-- Aktive Mitarbeitende dürfen nur Anfragen in ihrem eigenen Namen anlegen.
drop policy if exists "topic_requests_insert_own" on public.topic_requests;
create policy "topic_requests_insert_own"
on public.topic_requests for insert to authenticated
with check (
  requested_by_user_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.user_id::text = auth.uid()::text and p.status = 'active'
  )
);

-- Bearbeiten, Zuordnen und Abschließen ist ausschließlich Sache des Superadmins.
drop policy if exists "topic_requests_superadmin_update" on public.topic_requests;
create policy "topic_requests_superadmin_update"
on public.topic_requests for update to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.user_id::text = auth.uid()::text and p.status = 'active' and lower(p.role) = 'superadmin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.user_id::text = auth.uid()::text and p.status = 'active' and lower(p.role) = 'superadmin'
  )
);
