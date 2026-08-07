-- Anbieter-Crawler: vollständig getrennte Staging- und Queue-Struktur.
-- Bestehende Datensätze in public.providers werden durch diesen Patch nie geändert.

create extension if not exists pgcrypto;

-- Ältere CRM-Installationen hatten die Dashboard-Markierung nur im JSON-Payload.
-- Die relationale Spalte wird vor jeder Crawler-Referenz idempotent ergänzt. Der
-- Payload selbst wird bewusst nicht migriert oder geändert: Anbieter-Stammdaten
-- bleiben vollständig unverändert.
alter table if exists public.providers
  add column if not exists dashboard_created boolean not null default false;

create table if not exists public.provider_crawl_runs (
  id uuid primary key default gen_random_uuid(),
  provider_id text not null references public.providers(id) on delete restrict,
  provider_name_snapshot text not null default '',
  website_snapshot text not null default '',
  provider_updated_at_snapshot timestamptz,
  status text not null default 'queued' check (status in (
    'queued', 'running', 'completed', 'partial', 'failed', 'cancelled',
    'skipped_already_created', 'skipped_missing_website'
  )),
  review_status text not null default 'pending' check (review_status in ('pending', 'approved')),
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  last_crawled_at timestamptz,
  pages_scanned integer not null default 0 check (pages_scanned >= 0),
  experiences_found integer not null default 0 check (experiences_found >= 0),
  experiences_selected integer not null default 0 check (experiences_selected between 0 and 3),
  error_code text not null default '',
  error_message text not null default '',
  queued_by_user_id uuid references auth.users(id) on delete set null,
  started_by_user_id uuid references auth.users(id) on delete set null,
  approved_by_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((review_status <> 'approved') or (approved_by_user_id is not null and approved_at is not null))
);

create unique index if not exists provider_crawl_runs_one_active_per_provider
  on public.provider_crawl_runs (provider_id)
  where status in ('queued', 'running');
create index if not exists provider_crawl_runs_queue_idx
  on public.provider_crawl_runs (queued_at asc)
  where status = 'queued';
create index if not exists provider_crawl_runs_provider_idx
  on public.provider_crawl_runs (provider_id, created_at desc);

-- Atomare, kontrollierte Bulk-Queue. Die Funktion ist nur für den serverseitigen
-- service_role ausführbar; Browser-Rollen erhalten keinerlei EXECUTE-Recht.
create or replace function public.enqueue_provider_crawl_runs(
  target_provider_ids text[],
  actor_id uuid,
  enqueue_all boolean default false
)
returns table (id uuid, provider_id text, status text)
language sql
security invoker
set search_path = public
as $$
  insert into public.provider_crawl_runs (
    provider_id,
    provider_name_snapshot,
    website_snapshot,
    provider_updated_at_snapshot,
    status,
    queued_by_user_id
  )
  select
    p.id,
    p.name,
    p.website,
    p.updated_at,
    'queued',
    actor_id
  from public.providers p
  where p.dashboard_created = false
    -- Die Legacy-Markierung wird zusätzlich gelesen, nie verändert.
    and lower(coalesce(p.payload ->> 'dashboardCreated', p.payload ->> 'dashboard_created', 'false'))
      not in ('true', 't', '1', 'yes')
    and btrim(coalesce(p.website, '')) <> ''
    and (enqueue_all or p.id = any(coalesce(target_provider_ids, '{}'::text[])))
    and not exists (
      select 1 from public.provider_crawl_runs active_run
      where active_run.provider_id = p.id
        and active_run.status in ('queued', 'running')
    )
  returning provider_crawl_runs.id, provider_crawl_runs.provider_id, provider_crawl_runs.status;
$$;

revoke execute on function public.enqueue_provider_crawl_runs(text[], uuid, boolean) from public, anon, authenticated;
grant execute on function public.enqueue_provider_crawl_runs(text[], uuid, boolean) to service_role;

create table if not exists public.provider_crawl_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique references public.provider_crawl_runs(id) on delete cascade,
  -- Alle Fakten enthalten value/source_url/verification_status; kein Provider-Write.
  company_facts jsonb not null default '{}'::jsonb,
  managing_directors jsonb not null default '[]'::jsonb,
  original_slogan text not null default '',
  platform_slogan text not null default '',
  short_description text not null default '',
  detail_description text not null default '',
  review_notes text not null default '',
  edited_at timestamptz,
  edited_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(company_facts) = 'object'),
  check (jsonb_typeof(managing_directors) = 'array')
);

create table if not exists public.provider_crawl_experiences (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.provider_crawl_runs(id) on delete cascade,
  rank smallint not null check (rank between 1 and 3),
  original_title text not null default '',
  platform_title text not null default '',
  description text not null default '',
  location_facts jsonb not null default '{}'::jsonb,
  direct_url text not null default '',
  source_url text not null default '',
  evidence jsonb not null default '[]'::jsonb,
  selected boolean not null default true,
  removed_at timestamptz,
  removed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id, rank),
  check (jsonb_typeof(location_facts) = 'object'),
  check (jsonb_typeof(evidence) = 'array')
);
create index if not exists provider_crawl_experiences_run_idx
  on public.provider_crawl_experiences (run_id, rank);

create table if not exists public.provider_crawl_media (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.provider_crawl_runs(id) on delete cascade,
  experience_id uuid references public.provider_crawl_experiences(id) on delete cascade,
  media_kind text not null check (media_kind in ('logo', 'experience_image')),
  original_url text not null default '',
  source_url text not null default '',
  storage_bucket text not null default 'provider-crawler',
  storage_path text not null default '',
  file_type text not null default '',
  width integer,
  height integer,
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  content_hash text not null default '',
  selected boolean not null default true,
  removed_at timestamptz,
  removed_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (width is null or width > 0),
  check (height is null or height > 0)
);
create index if not exists provider_crawl_media_run_idx
  on public.provider_crawl_media (run_id, media_kind, selected);
create index if not exists provider_crawl_media_experience_idx
  on public.provider_crawl_media (experience_id, selected)
  where experience_id is not null;

create table if not exists public.provider_crawl_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.provider_crawl_runs(id) on delete cascade,
  event_type text not null check (event_type in (
    'queued', 'started', 'completed', 'partial', 'failed', 'skipped',
    'review_edited', 'approved', 'media_removed'
  )),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  check (jsonb_typeof(payload) = 'object')
);
create index if not exists provider_crawl_events_run_created_idx
  on public.provider_crawl_events (run_id, created_at desc);

create or replace function public.set_provider_crawler_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_provider_crawl_runs_updated_at on public.provider_crawl_runs;
create trigger trg_provider_crawl_runs_updated_at
before update on public.provider_crawl_runs
for each row execute procedure public.set_provider_crawler_updated_at();

drop trigger if exists trg_provider_crawl_results_updated_at on public.provider_crawl_results;
create trigger trg_provider_crawl_results_updated_at
before update on public.provider_crawl_results
for each row execute procedure public.set_provider_crawler_updated_at();

drop trigger if exists trg_provider_crawl_experiences_updated_at on public.provider_crawl_experiences;
create trigger trg_provider_crawl_experiences_updated_at
before update on public.provider_crawl_experiences
for each row execute procedure public.set_provider_crawler_updated_at();

-- Die Freigabe ist ausschließlich ein Staging-Review. Anbieter-Stammdaten bleiben unberührt.
create or replace function public.guard_provider_crawl_run_integrity()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.provider_id is distinct from old.provider_id then
    raise exception 'Die Anbieterreferenz eines Crawl-Laufs ist unveränderlich.';
  end if;
  if new.review_status = 'approved' and old.review_status is distinct from 'approved' then
    new.approved_at = coalesce(new.approved_at, now());
    new.approved_by_user_id = coalesce(new.approved_by_user_id, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_provider_crawl_run_guard on public.provider_crawl_runs;
create trigger trg_provider_crawl_run_guard
before update on public.provider_crawl_runs
for each row execute procedure public.guard_provider_crawl_run_integrity();

alter table public.provider_crawl_runs enable row level security;
alter table public.provider_crawl_results enable row level security;
alter table public.provider_crawl_experiences enable row level security;
alter table public.provider_crawl_media enable row level security;
alter table public.provider_crawl_events enable row level security;

-- Default deny: Nur AAL2-geprüfte Admins/Superadmins dürfen Ergebnisse direkt lesen.
-- Alle Mutationen erfolgen zusätzlich ausschließlich über serverseitig authentifizierte APIs.
drop policy if exists provider_crawl_runs_admin_select on public.provider_crawl_runs;
create policy provider_crawl_runs_admin_select on public.provider_crawl_runs
for select to authenticated using (public.is_admin());
drop policy if exists provider_crawl_results_admin_select on public.provider_crawl_results;
create policy provider_crawl_results_admin_select on public.provider_crawl_results
for select to authenticated using (public.is_admin());
drop policy if exists provider_crawl_experiences_admin_select on public.provider_crawl_experiences;
create policy provider_crawl_experiences_admin_select on public.provider_crawl_experiences
for select to authenticated using (public.is_admin());
drop policy if exists provider_crawl_media_admin_select on public.provider_crawl_media;
create policy provider_crawl_media_admin_select on public.provider_crawl_media
for select to authenticated using (public.is_admin());
drop policy if exists provider_crawl_events_admin_select on public.provider_crawl_events;
create policy provider_crawl_events_admin_select on public.provider_crawl_events
for select to authenticated using (public.is_admin());

revoke insert, update, delete on public.provider_crawl_runs from authenticated;
revoke insert, update, delete on public.provider_crawl_results from authenticated;
revoke insert, update, delete on public.provider_crawl_experiences from authenticated;
revoke insert, update, delete on public.provider_crawl_media from authenticated;
revoke insert, update, delete on public.provider_crawl_events from authenticated;

-- Privater Bucket: Zugriff ausschließlich über den serverseitigen Crawler.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'provider-crawler',
  'provider-crawler',
  false,
  20971520,
  array['image/jpeg', 'image/png']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
