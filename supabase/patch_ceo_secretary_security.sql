-- -------------------------------------------------------------
-- CEO Office / Sicherheitsprotokoll
-- Append-only Audit fuer gelesene Kontexte und Aenderungen.
-- Idempotent ausfuehrbar. Nach dem Ausfuehren kann kein
-- angemeldeter Benutzer Protokolleintraege veraendern oder loeschen.
-- -------------------------------------------------------------

create extension if not exists pgcrypto;

create table if not exists public.ceo_secretary_audit_events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  source text not null default 'ceo_secretary',
  entity_type text not null,
  entity_id text not null default '',
  entity_label text not null default '',
  before_state jsonb,
  after_state jsonb,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ceo_secretary_audit_events
  add column if not exists owner_user_id uuid references auth.users(id) on delete cascade,
  add column if not exists actor_user_id uuid references auth.users(id) on delete set null,
  add column if not exists event_type text not null default 'entry_updated',
  add column if not exists source text not null default 'ceo_secretary',
  add column if not exists entity_type text not null default 'ceo_entry',
  add column if not exists entity_id text not null default '',
  add column if not exists entity_label text not null default '',
  add column if not exists before_state jsonb,
  add column if not exists after_state jsonb,
  add column if not exists details jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

alter table public.ceo_secretary_audit_events
  drop constraint if exists ceo_secretary_audit_events_event_type_check;
alter table public.ceo_secretary_audit_events
  add constraint ceo_secretary_audit_events_event_type_check
  check (event_type in (
    'assistant_context_read',
    'entry_created',
    'entry_updated',
    'entry_completed',
    'entry_reopened',
    'entry_deleted',
    'employee_role_changed'
  ));

alter table public.ceo_secretary_audit_events
  drop constraint if exists ceo_secretary_audit_events_entity_type_check;
alter table public.ceo_secretary_audit_events
  add constraint ceo_secretary_audit_events_entity_type_check
  check (entity_type in ('ceo_context', 'ceo_entry', 'employee'));

create index if not exists idx_ceo_secretary_audit_events_owner_created
  on public.ceo_secretary_audit_events (owner_user_id, created_at desc);

alter table public.ceo_secretary_audit_events enable row level security;

-- Kein direkter Schreibzugriff aus dem Browser: das Protokoll bleibt
-- unveraenderbar. Der Server und die untenstehenden Trigger schreiben es.
revoke all on public.ceo_secretary_audit_events from public;
revoke all on public.ceo_secretary_audit_events from anon;
revoke all on public.ceo_secretary_audit_events from authenticated;
grant select on public.ceo_secretary_audit_events to authenticated;
grant insert on public.ceo_secretary_audit_events to service_role;

drop policy if exists "ceo_secretary_audit_events_owner_select" on public.ceo_secretary_audit_events;
create policy "ceo_secretary_audit_events_owner_select"
on public.ceo_secretary_audit_events
for select
to authenticated
using (public.is_superadmin() and owner_user_id = auth.uid());

create or replace function public.ceo_secretary_entry_audit_snapshot(entry_row public.ceo_secretary_entries)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'title', coalesce(entry_row.title, ''),
    'entry_type', coalesce(entry_row.entry_type, ''),
    'context_label', coalesce(entry_row.context_label, ''),
    'due_date', entry_row.due_date,
    'priority', coalesce(entry_row.priority, 'normal'),
    'is_completed', coalesce(entry_row.is_completed, false),
    'body_length', char_length(coalesce(entry_row.body, ''))
  );
$$;

create or replace function public.log_ceo_secretary_entry_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_owner uuid;
  audit_event_type text;
  audit_actor uuid;
begin
  audit_actor := auth.uid();

  if tg_op = 'INSERT' then
    audit_owner := new.created_by_user_id;
    audit_event_type := 'entry_created';
    insert into public.ceo_secretary_audit_events (
      owner_user_id, actor_user_id, event_type, source, entity_type, entity_id, entity_label, after_state
    ) values (
      audit_owner, audit_actor, audit_event_type, 'ceo_secretary', 'ceo_entry', new.id::text,
      coalesce(new.title, ''), public.ceo_secretary_entry_audit_snapshot(new)
    );
    return new;
  end if;

  audit_owner := old.created_by_user_id;
  if tg_op = 'DELETE' then
    insert into public.ceo_secretary_audit_events (
      owner_user_id, actor_user_id, event_type, source, entity_type, entity_id, entity_label, before_state
    ) values (
      audit_owner, audit_actor, 'entry_deleted', 'ceo_secretary', 'ceo_entry', old.id::text,
      coalesce(old.title, ''), public.ceo_secretary_entry_audit_snapshot(old)
    );
    return old;
  end if;

  audit_event_type := case
    when old.is_completed is distinct from new.is_completed and new.is_completed then 'entry_completed'
    when old.is_completed is distinct from new.is_completed and not new.is_completed then 'entry_reopened'
    else 'entry_updated'
  end;
  insert into public.ceo_secretary_audit_events (
    owner_user_id, actor_user_id, event_type, source, entity_type, entity_id, entity_label, before_state, after_state
  ) values (
    audit_owner, audit_actor, audit_event_type, 'ceo_secretary', 'ceo_entry', new.id::text,
    coalesce(new.title, old.title, ''), public.ceo_secretary_entry_audit_snapshot(old),
    public.ceo_secretary_entry_audit_snapshot(new)
  );
  return new;
end;
$$;

drop trigger if exists trg_ceo_secretary_entries_audit on public.ceo_secretary_entries;
create trigger trg_ceo_secretary_entries_audit
after insert or update or delete on public.ceo_secretary_entries
for each row execute procedure public.log_ceo_secretary_entry_audit();

create or replace function public.log_ceo_secretary_profile_role_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_actor uuid;
begin
  if old.role is not distinct from new.role then
    return new;
  end if;
  audit_actor := auth.uid();
  if audit_actor is null then
    return new;
  end if;
  insert into public.ceo_secretary_audit_events (
    owner_user_id, actor_user_id, event_type, source, entity_type, entity_id, entity_label, before_state, after_state
  ) values (
    audit_actor, audit_actor, 'employee_role_changed', 'ceo_secretary', 'employee', new.user_id::text,
    coalesce(new.full_name, new.email, 'Mitarbeiter'),
    jsonb_build_object('role', coalesce(old.role, '')),
    jsonb_build_object('role', coalesce(new.role, ''))
  );
  return new;
end;
$$;

drop trigger if exists trg_profiles_ceo_secretary_role_audit on public.profiles;
create trigger trg_profiles_ceo_secretary_role_audit
after update of role on public.profiles
for each row execute procedure public.log_ceo_secretary_profile_role_audit();

-- Das Sicherheitsprotokoll ist append-only, auch fuer versehentliche
-- Aenderungen direkt in der Datenbank.
create or replace function public.prevent_ceo_secretary_audit_event_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'CEO-Sicherheitsprotokolle sind unveraenderbar.';
end;
$$;

drop trigger if exists trg_ceo_secretary_audit_events_append_only on public.ceo_secretary_audit_events;
create trigger trg_ceo_secretary_audit_events_append_only
before update or delete on public.ceo_secretary_audit_events
for each row execute procedure public.prevent_ceo_secretary_audit_event_mutation();

-- -------------------------------------------------------------
-- END FILE: supabase/patch_ceo_secretary_security.sql
-- -------------------------------------------------------------
