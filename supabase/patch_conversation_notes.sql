-- Gesprächsnotizen + Aufgaben (relational) für Supabase
-- Im Supabase SQL Editor ausführen.
-- Idempotent: kann mehrfach ausgeführt werden.

create extension if not exists pgcrypto;

create table if not exists public.conversation_threads (
  id text primary key,
  title text not null default '',
  contact_name text not null default '',
  contact_type text not null default 'extern' check (contact_type in ('intern', 'extern')),
  organization_id text,
  organization text not null default '',
  channel text not null default 'meeting' check (channel in ('meeting', 'telefon', 'email', 'whatsapp', 'sonstiges')),
  conversation_date date,
  internal_participant_user_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_by_role text not null default 'mitarbeiter',
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_name text not null default '',
  updated_by_role text not null default 'mitarbeiter'
);

create table if not exists public.conversation_organizations (
  id text primary key,
  name text not null,
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  website text not null default '',
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_by_role text not null default 'mitarbeiter',
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_name text not null default '',
  updated_by_role text not null default 'mitarbeiter'
);

create table if not exists public.conversation_tasks (
  id text primary key,
  thread_id text not null references public.conversation_threads(id) on delete cascade,
  title text not null default '',
  assignee_user_id uuid references auth.users(id) on delete set null,
  assignee_name text not null default '',
  due_date date,
  priority text not null default 'mittel' check (priority in ('niedrig', 'mittel', 'hoch')),
  status text not null default 'offen' check (status in ('offen', 'in_arbeit', 'warten', 'erledigt')),
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_by_role text not null default 'mitarbeiter',
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_name text not null default '',
  updated_by_role text not null default 'mitarbeiter'
);

create table if not exists public.conversation_notes (
  id text primary key,
  thread_id text not null references public.conversation_threads(id) on delete cascade,
  note_text text not null default '',
  linked_task_id text,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_by_role text not null default 'mitarbeiter',
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_name text not null default '',
  updated_by_role text not null default 'mitarbeiter'
);

alter table public.conversation_threads
  add column if not exists organization_id text;

alter table public.conversation_threads
  add column if not exists internal_participant_user_ids text[] not null default '{}';

alter table public.conversation_threads
  drop constraint if exists conversation_threads_organization_id_fkey;

alter table public.conversation_threads
  add constraint conversation_threads_organization_id_fkey
  foreign key (organization_id) references public.conversation_organizations(id) on delete set null;

create index if not exists idx_conversation_threads_updated_at
  on public.conversation_threads (updated_at desc);

create index if not exists idx_conversation_threads_organization_id
  on public.conversation_threads (organization_id);

create index if not exists idx_conversation_tasks_thread_id
  on public.conversation_tasks (thread_id);

create index if not exists idx_conversation_tasks_assignee_user_id
  on public.conversation_tasks (assignee_user_id);

create index if not exists idx_conversation_tasks_status_due_date
  on public.conversation_tasks (status, due_date);

create index if not exists idx_conversation_notes_thread_id
  on public.conversation_notes (thread_id);

create index if not exists idx_conversation_notes_created_at
  on public.conversation_notes (created_at desc);

create index if not exists idx_conversation_organizations_name
  on public.conversation_organizations (lower(name));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_conversation_threads_updated_at on public.conversation_threads;
create trigger trg_conversation_threads_updated_at
before update on public.conversation_threads
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_conversation_tasks_updated_at on public.conversation_tasks;
create trigger trg_conversation_tasks_updated_at
before update on public.conversation_tasks
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_conversation_notes_updated_at on public.conversation_notes;
create trigger trg_conversation_notes_updated_at
before update on public.conversation_notes
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_conversation_organizations_updated_at on public.conversation_organizations;
create trigger trg_conversation_organizations_updated_at
before update on public.conversation_organizations
for each row execute procedure public.set_updated_at();

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'superadmin', false);
$$;

alter table public.conversation_threads enable row level security;
alter table public.conversation_tasks enable row level security;
alter table public.conversation_notes enable row level security;
alter table public.conversation_organizations enable row level security;

-- Threads: ausschließlich Superadmin

drop policy if exists "conversation_threads_superadmin_select" on public.conversation_threads;
create policy "conversation_threads_superadmin_select"
on public.conversation_threads
for select
to authenticated
using (public.is_superadmin());

drop policy if exists "conversation_threads_superadmin_insert" on public.conversation_threads;
create policy "conversation_threads_superadmin_insert"
on public.conversation_threads
for insert
to authenticated
with check (public.is_superadmin());

drop policy if exists "conversation_threads_superadmin_update" on public.conversation_threads;
create policy "conversation_threads_superadmin_update"
on public.conversation_threads
for update
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "conversation_threads_superadmin_delete" on public.conversation_threads;
create policy "conversation_threads_superadmin_delete"
on public.conversation_threads
for delete
to authenticated
using (public.is_superadmin());

-- Organizationen: ausschließlich Superadmin

drop policy if exists "conversation_organizations_superadmin_select" on public.conversation_organizations;
create policy "conversation_organizations_superadmin_select"
on public.conversation_organizations
for select
to authenticated
using (public.is_superadmin());

drop policy if exists "conversation_organizations_superadmin_insert" on public.conversation_organizations;
create policy "conversation_organizations_superadmin_insert"
on public.conversation_organizations
for insert
to authenticated
with check (public.is_superadmin());

drop policy if exists "conversation_organizations_superadmin_update" on public.conversation_organizations;
create policy "conversation_organizations_superadmin_update"
on public.conversation_organizations
for update
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "conversation_organizations_superadmin_delete" on public.conversation_organizations;
create policy "conversation_organizations_superadmin_delete"
on public.conversation_organizations
for delete
to authenticated
using (public.is_superadmin());

-- Notes: ausschließlich Superadmin

drop policy if exists "conversation_notes_superadmin_select" on public.conversation_notes;
create policy "conversation_notes_superadmin_select"
on public.conversation_notes
for select
to authenticated
using (public.is_superadmin());

drop policy if exists "conversation_notes_superadmin_insert" on public.conversation_notes;
create policy "conversation_notes_superadmin_insert"
on public.conversation_notes
for insert
to authenticated
with check (public.is_superadmin());

drop policy if exists "conversation_notes_superadmin_update" on public.conversation_notes;
create policy "conversation_notes_superadmin_update"
on public.conversation_notes
for update
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "conversation_notes_superadmin_delete" on public.conversation_notes;
create policy "conversation_notes_superadmin_delete"
on public.conversation_notes
for delete
to authenticated
using (public.is_superadmin());

-- Tasks: Superadmin voll; zusätzlich darf ein aktiver Assignee lesen

drop policy if exists "conversation_tasks_superadmin_or_assignee_select" on public.conversation_tasks;
create policy "conversation_tasks_superadmin_or_assignee_select"
on public.conversation_tasks
for select
to authenticated
using (
  public.is_superadmin()
  or (
    assignee_user_id::text = auth.uid()::text
    and exists (
      select 1
      from public.profiles p
      where p.user_id::text = auth.uid()::text
        and p.status = 'active'
    )
  )
);

drop policy if exists "conversation_tasks_superadmin_insert" on public.conversation_tasks;
create policy "conversation_tasks_superadmin_insert"
on public.conversation_tasks
for insert
to authenticated
with check (public.is_superadmin());

drop policy if exists "conversation_tasks_superadmin_update" on public.conversation_tasks;
create policy "conversation_tasks_superadmin_update"
on public.conversation_tasks
for update
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

drop policy if exists "conversation_tasks_superadmin_delete" on public.conversation_tasks;
create policy "conversation_tasks_superadmin_delete"
on public.conversation_tasks
for delete
to authenticated
using (public.is_superadmin());

-- Backfill Organizationen aus app_state.payload.settings.conversationOrganizations

with source as (
  select coalesce(payload -> 'settings' -> 'conversationOrganizations', '[]'::jsonb) as organizations_json
  from public.app_state
  where id = 'main'
),
organization_rows as (
  select
    coalesce(nullif(org_obj ->> 'id', ''), gen_random_uuid()::text) as id,
    coalesce(org_obj ->> 'name', '') as name,
    coalesce(org_obj ->> 'contactName', '') as contact_name,
    coalesce(org_obj ->> 'email', '') as email,
    coalesce(org_obj ->> 'phone', '') as phone,
    coalesce(org_obj ->> 'website', '') as website,
    case
      when coalesce(org_obj ->> 'createdAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (org_obj ->> 'createdAt')::timestamptz
      else now()
    end as created_at
  from source,
  lateral jsonb_array_elements(source.organizations_json) as org_obj
)
insert into public.conversation_organizations (
  id,
  name,
  contact_name,
  email,
  phone,
  website,
  created_at
)
select
  id,
  name,
  contact_name,
  email,
  phone,
  website,
  created_at
from organization_rows
where name <> ''
on conflict (id) do update
  set name = excluded.name,
      contact_name = excluded.contact_name,
      email = excluded.email,
      phone = excluded.phone,
      website = excluded.website,
      created_at = excluded.created_at;

-- Backfill aus app_state.payload.settings.conversationThreads
-- Läuft idempotent (upsert).

with source as (
  select coalesce(payload -> 'settings' -> 'conversationThreads', '[]'::jsonb) as threads_json
  from public.app_state
  where id = 'main'
),
thread_rows as (
  select
    coalesce(nullif(thread_obj ->> 'id', ''), gen_random_uuid()::text) as id,
    coalesce(thread_obj ->> 'title', '') as title,
    coalesce(thread_obj ->> 'contactName', '') as contact_name,
    case
      when lower(coalesce(thread_obj ->> 'contactType', 'extern')) in ('intern', 'extern') then lower(thread_obj ->> 'contactType')
      else 'extern'
    end as contact_type,
    case
      when exists (
        select 1
        from public.conversation_organizations o
        where o.id = nullif(coalesce(thread_obj ->> 'organizationId', ''), '')
      ) then nullif(coalesce(thread_obj ->> 'organizationId', ''), '')
      else null
    end as organization_id,
    coalesce(thread_obj ->> 'organization', '') as organization,
    case
      when lower(coalesce(thread_obj ->> 'channel', 'meeting')) in ('meeting', 'telefon', 'email', 'whatsapp', 'sonstiges')
        then lower(thread_obj ->> 'channel')
      else 'meeting'
    end as channel,
    case
      when coalesce(thread_obj ->> 'conversationDate', '') ~ '^\d{4}-\d{2}-\d{2}$' then (thread_obj ->> 'conversationDate')::date
      else null
    end as conversation_date,
    coalesce(
      array(
        select jsonb_array_elements_text(coalesce(thread_obj -> 'internalParticipantUserIds', '[]'::jsonb))
      ),
      '{}'
    )::text[] as internal_participant_user_ids,
    case
      when coalesce(thread_obj ->> 'createdAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (thread_obj ->> 'createdAt')::timestamptz
      else now()
    end as created_at,
    case
      when coalesce(thread_obj ->> 'createdByUserId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (thread_obj ->> 'createdByUserId')::uuid
      else null
    end as created_by_user_id,
    coalesce(thread_obj ->> 'createdByName', '') as created_by_name,
    coalesce(thread_obj ->> 'createdByRole', 'mitarbeiter') as created_by_role,
    case
      when coalesce(thread_obj ->> 'updatedAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (thread_obj ->> 'updatedAt')::timestamptz
      else now()
    end as updated_at,
    case
      when coalesce(thread_obj ->> 'updatedByUserId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (thread_obj ->> 'updatedByUserId')::uuid
      else null
    end as updated_by_user_id,
    coalesce(thread_obj ->> 'updatedByName', '') as updated_by_name,
    coalesce(thread_obj ->> 'updatedByRole', 'mitarbeiter') as updated_by_role,
    thread_obj
  from source,
  lateral jsonb_array_elements(source.threads_json) as thread_obj
),
thread_upsert as (
  insert into public.conversation_threads (
    id,
    title,
    contact_name,
    contact_type,
    organization_id,
    organization,
    channel,
    conversation_date,
    internal_participant_user_ids,
    created_at,
    created_by_user_id,
    created_by_name,
    created_by_role,
    updated_at,
    updated_by_user_id,
    updated_by_name,
    updated_by_role
  )
  select
    id,
    title,
    contact_name,
    contact_type,
    organization_id,
    organization,
    channel,
    conversation_date,
    internal_participant_user_ids,
    created_at,
    created_by_user_id,
    created_by_name,
    created_by_role,
    updated_at,
    updated_by_user_id,
    updated_by_name,
    updated_by_role
  from thread_rows
  on conflict (id) do update
    set title = excluded.title,
        contact_name = excluded.contact_name,
        contact_type = excluded.contact_type,
        organization_id = excluded.organization_id,
        organization = excluded.organization,
        channel = excluded.channel,
        conversation_date = excluded.conversation_date,
        internal_participant_user_ids = excluded.internal_participant_user_ids,
        created_at = excluded.created_at,
        created_by_user_id = excluded.created_by_user_id,
        created_by_name = excluded.created_by_name,
        created_by_role = excluded.created_by_role,
        updated_at = excluded.updated_at,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_by_name = excluded.updated_by_name,
        updated_by_role = excluded.updated_by_role
  returning id
),
thread_org_link as (
  update public.conversation_threads t
  set organization_id = o.id
  from public.conversation_organizations o
  where t.id in (select id from thread_upsert)
    and coalesce(t.organization_id, '') = ''
    and coalesce(t.organization, '') <> ''
    and lower(o.name) = lower(t.organization)
  returning t.id
),
task_rows as (
  select
    coalesce(nullif(task_obj ->> 'id', ''), gen_random_uuid()::text) as id,
    tr.id as thread_id,
    coalesce(task_obj ->> 'title', '') as title,
    case
      when coalesce(task_obj ->> 'assigneeUserId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (task_obj ->> 'assigneeUserId')::uuid
      else null
    end as assignee_user_id,
    coalesce(task_obj ->> 'assigneeName', '') as assignee_name,
    case
      when coalesce(task_obj ->> 'dueDate', '') ~ '^\d{4}-\d{2}-\d{2}$' then (task_obj ->> 'dueDate')::date
      else null
    end as due_date,
    case
      when lower(coalesce(task_obj ->> 'priority', 'mittel')) in ('niedrig', 'mittel', 'hoch') then lower(task_obj ->> 'priority')
      else 'mittel'
    end as priority,
    case
      when lower(coalesce(task_obj ->> 'status', 'offen')) in ('offen', 'in_arbeit', 'warten', 'erledigt') then lower(task_obj ->> 'status')
      else 'offen'
    end as status,
    case
      when coalesce(task_obj ->> 'createdAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (task_obj ->> 'createdAt')::timestamptz
      else now()
    end as created_at,
    case
      when coalesce(task_obj ->> 'createdByUserId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (task_obj ->> 'createdByUserId')::uuid
      else null
    end as created_by_user_id,
    coalesce(task_obj ->> 'createdByName', '') as created_by_name,
    coalesce(task_obj ->> 'createdByRole', 'mitarbeiter') as created_by_role,
    case
      when coalesce(task_obj ->> 'updatedAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (task_obj ->> 'updatedAt')::timestamptz
      else now()
    end as updated_at,
    case
      when coalesce(task_obj ->> 'updatedByUserId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (task_obj ->> 'updatedByUserId')::uuid
      else null
    end as updated_by_user_id,
    coalesce(task_obj ->> 'updatedByName', '') as updated_by_name,
    coalesce(task_obj ->> 'updatedByRole', 'mitarbeiter') as updated_by_role
  from thread_rows tr,
  lateral jsonb_array_elements(coalesce(tr.thread_obj -> 'tasks', '[]'::jsonb)) as task_obj
),
notes_rows as (
  select
    coalesce(nullif(note_obj ->> 'id', ''), gen_random_uuid()::text) as id,
    tr.id as thread_id,
    coalesce(note_obj ->> 'text', '') as note_text,
    nullif(note_obj ->> 'linkedTaskId', '') as linked_task_id,
    case
      when coalesce(note_obj ->> 'createdAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (note_obj ->> 'createdAt')::timestamptz
      else now()
    end as created_at,
    case
      when coalesce(note_obj ->> 'createdByUserId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (note_obj ->> 'createdByUserId')::uuid
      else null
    end as created_by_user_id,
    coalesce(note_obj ->> 'createdByName', '') as created_by_name,
    coalesce(note_obj ->> 'createdByRole', 'mitarbeiter') as created_by_role,
    case
      when coalesce(note_obj ->> 'updatedAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (note_obj ->> 'updatedAt')::timestamptz
      else now()
    end as updated_at,
    case
      when coalesce(note_obj ->> 'updatedByUserId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (note_obj ->> 'updatedByUserId')::uuid
      else null
    end as updated_by_user_id,
    coalesce(note_obj ->> 'updatedByName', '') as updated_by_name,
    coalesce(note_obj ->> 'updatedByRole', 'mitarbeiter') as updated_by_role
  from thread_rows tr,
  lateral jsonb_array_elements(coalesce(tr.thread_obj -> 'notes', '[]'::jsonb)) as note_obj
)
insert into public.conversation_tasks (
  id,
  thread_id,
  title,
  assignee_user_id,
  assignee_name,
  due_date,
  priority,
  status,
  created_at,
  created_by_user_id,
  created_by_name,
  created_by_role,
  updated_at,
  updated_by_user_id,
  updated_by_name,
  updated_by_role
)
select
  id,
  thread_id,
  title,
  assignee_user_id,
  assignee_name,
  due_date,
  priority,
  status,
  created_at,
  created_by_user_id,
  created_by_name,
  created_by_role,
  updated_at,
  updated_by_user_id,
  updated_by_name,
  updated_by_role
from task_rows
where thread_id in (select id from thread_upsert)
on conflict (id) do update
  set thread_id = excluded.thread_id,
      title = excluded.title,
      assignee_user_id = excluded.assignee_user_id,
      assignee_name = excluded.assignee_name,
      due_date = excluded.due_date,
      priority = excluded.priority,
      status = excluded.status,
      created_at = excluded.created_at,
      created_by_user_id = excluded.created_by_user_id,
      created_by_name = excluded.created_by_name,
      created_by_role = excluded.created_by_role,
      updated_at = excluded.updated_at,
      updated_by_user_id = excluded.updated_by_user_id,
      updated_by_name = excluded.updated_by_name,
      updated_by_role = excluded.updated_by_role;

with source as (
  select coalesce(payload -> 'settings' -> 'conversationThreads', '[]'::jsonb) as threads_json
  from public.app_state
  where id = 'main'
),
thread_rows as (
  select
    coalesce(nullif(thread_obj ->> 'id', ''), gen_random_uuid()::text) as id,
    thread_obj
  from source,
  lateral jsonb_array_elements(source.threads_json) as thread_obj
),
notes_rows as (
  select
    coalesce(nullif(note_obj ->> 'id', ''), gen_random_uuid()::text) as id,
    tr.id as thread_id,
    coalesce(note_obj ->> 'text', '') as note_text,
    nullif(note_obj ->> 'linkedTaskId', '') as linked_task_id,
    case
      when coalesce(note_obj ->> 'createdAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (note_obj ->> 'createdAt')::timestamptz
      else now()
    end as created_at,
    case
      when coalesce(note_obj ->> 'createdByUserId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (note_obj ->> 'createdByUserId')::uuid
      else null
    end as created_by_user_id,
    coalesce(note_obj ->> 'createdByName', '') as created_by_name,
    coalesce(note_obj ->> 'createdByRole', 'mitarbeiter') as created_by_role,
    case
      when coalesce(note_obj ->> 'updatedAt', '') ~ '^\d{4}-\d{2}-\d{2}T' then (note_obj ->> 'updatedAt')::timestamptz
      else now()
    end as updated_at,
    case
      when coalesce(note_obj ->> 'updatedByUserId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then (note_obj ->> 'updatedByUserId')::uuid
      else null
    end as updated_by_user_id,
    coalesce(note_obj ->> 'updatedByName', '') as updated_by_name,
    coalesce(note_obj ->> 'updatedByRole', 'mitarbeiter') as updated_by_role
  from thread_rows tr,
  lateral jsonb_array_elements(coalesce(tr.thread_obj -> 'notes', '[]'::jsonb)) as note_obj
)
insert into public.conversation_notes (
  id,
  thread_id,
  note_text,
  linked_task_id,
  created_at,
  created_by_user_id,
  created_by_name,
  created_by_role,
  updated_at,
  updated_by_user_id,
  updated_by_name,
  updated_by_role
)
select
  id,
  thread_id,
  note_text,
  linked_task_id,
  created_at,
  created_by_user_id,
  created_by_name,
  created_by_role,
  updated_at,
  updated_by_user_id,
  updated_by_name,
  updated_by_role
from notes_rows
on conflict (id) do update
  set thread_id = excluded.thread_id,
      note_text = excluded.note_text,
      linked_task_id = excluded.linked_task_id,
      created_at = excluded.created_at,
      created_by_user_id = excluded.created_by_user_id,
      created_by_name = excluded.created_by_name,
      created_by_role = excluded.created_by_role,
      updated_at = excluded.updated_at,
      updated_by_user_id = excluded.updated_by_user_id,
      updated_by_name = excluded.updated_by_name,
      updated_by_role = excluded.updated_by_role;
