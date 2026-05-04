-- Telefonakquise: Calls + Notizen + Aufgaben
-- Im Supabase SQL Editor ausführen.
-- Idempotent: kann mehrfach ausgeführt werden.

create extension if not exists pgcrypto;

create table if not exists public.sales_phone_calls (
  id text primary key,
  provider_id text not null,
  provider_name text not null default '',
  provider_phone text not null default '',
  assignee_user_id uuid references auth.users(id) on delete set null,
  assignee_name text not null default '',
  planned_date date,
  plan_slot text not null default 'vormittag'
    check (plan_slot in ('vormittag', 'mittag', 'nachmittag', 'abend')),
  status text not null default 'neu'
    check (
      status in (
        'neu',
        'nicht_erreicht',
        'mailbox',
        'rueckruf',
        'erreicht',
        'kein_interesse',
        'interessiert',
        'angebot_gesendet',
        'termin_vereinbart',
        'abschluss'
      )
    ),
  reminder_at timestamptz,
  last_contact_at timestamptz,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_by_role text not null default 'mitarbeiter',
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_name text not null default '',
  updated_by_role text not null default 'mitarbeiter'
);

create table if not exists public.sales_phone_notes (
  id text primary key,
  call_id text not null references public.sales_phone_calls(id) on delete cascade,
  note_text text not null default '',
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_by_role text not null default 'mitarbeiter'
);

create table if not exists public.sales_phone_tasks (
  id text primary key,
  call_id text not null references public.sales_phone_calls(id) on delete cascade,
  title text not null default '',
  assignee_user_id uuid references auth.users(id) on delete set null,
  assignee_name text not null default '',
  due_date date,
  status text not null default 'offen' check (status in ('offen', 'erledigt')),
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text not null default '',
  created_by_role text not null default 'mitarbeiter',
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id) on delete set null,
  updated_by_name text not null default '',
  updated_by_role text not null default 'mitarbeiter'
);

create index if not exists idx_sales_phone_calls_assignee_user_id
  on public.sales_phone_calls (assignee_user_id);

create index if not exists idx_sales_phone_calls_status_planned_date
  on public.sales_phone_calls (status, planned_date);

create index if not exists idx_sales_phone_calls_reminder_at
  on public.sales_phone_calls (reminder_at);

create index if not exists idx_sales_phone_notes_call_id
  on public.sales_phone_notes (call_id);

create index if not exists idx_sales_phone_tasks_call_id
  on public.sales_phone_tasks (call_id);

create index if not exists idx_sales_phone_tasks_assignee_status_due
  on public.sales_phone_tasks (assignee_user_id, status, due_date);

create or replace function public.sales_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('superadmin', 'admin')
  );
$$;

create or replace function public.sales_phone_call_visible(call_row public.sales_phone_calls)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.sales_user_is_admin()
    or call_row.assignee_user_id = auth.uid()
    or call_row.created_by_user_id = auth.uid(),
    false
  );
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sales_phone_calls_updated_at on public.sales_phone_calls;
create trigger trg_sales_phone_calls_updated_at
before update on public.sales_phone_calls
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_sales_phone_tasks_updated_at on public.sales_phone_tasks;
create trigger trg_sales_phone_tasks_updated_at
before update on public.sales_phone_tasks
for each row execute procedure public.set_updated_at();

alter table public.sales_phone_calls enable row level security;
alter table public.sales_phone_notes enable row level security;
alter table public.sales_phone_tasks enable row level security;

drop policy if exists "sales_phone_calls_select" on public.sales_phone_calls;
create policy "sales_phone_calls_select"
on public.sales_phone_calls
for select
to authenticated
using (public.sales_phone_call_visible(sales_phone_calls));

drop policy if exists "sales_phone_calls_insert" on public.sales_phone_calls;
create policy "sales_phone_calls_insert"
on public.sales_phone_calls
for insert
to authenticated
with check (
  public.sales_user_is_admin()
  or assignee_user_id = auth.uid()
  or created_by_user_id = auth.uid()
);

drop policy if exists "sales_phone_calls_update" on public.sales_phone_calls;
create policy "sales_phone_calls_update"
on public.sales_phone_calls
for update
to authenticated
using (public.sales_phone_call_visible(sales_phone_calls))
with check (
  public.sales_user_is_admin()
  or assignee_user_id = auth.uid()
  or created_by_user_id = auth.uid()
);

drop policy if exists "sales_phone_calls_delete" on public.sales_phone_calls;
create policy "sales_phone_calls_delete"
on public.sales_phone_calls
for delete
to authenticated
using (public.sales_phone_call_visible(sales_phone_calls));

drop policy if exists "sales_phone_notes_select" on public.sales_phone_notes;
create policy "sales_phone_notes_select"
on public.sales_phone_notes
for select
to authenticated
using (
  exists (
    select 1
    from public.sales_phone_calls c
    where c.id = sales_phone_notes.call_id
      and public.sales_phone_call_visible(c)
  )
);

drop policy if exists "sales_phone_notes_insert" on public.sales_phone_notes;
create policy "sales_phone_notes_insert"
on public.sales_phone_notes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.sales_phone_calls c
    where c.id = sales_phone_notes.call_id
      and public.sales_phone_call_visible(c)
  )
);

drop policy if exists "sales_phone_notes_delete" on public.sales_phone_notes;
create policy "sales_phone_notes_delete"
on public.sales_phone_notes
for delete
to authenticated
using (
  exists (
    select 1
    from public.sales_phone_calls c
    where c.id = sales_phone_notes.call_id
      and public.sales_phone_call_visible(c)
  )
);

drop policy if exists "sales_phone_tasks_select" on public.sales_phone_tasks;
create policy "sales_phone_tasks_select"
on public.sales_phone_tasks
for select
to authenticated
using (
  exists (
    select 1
    from public.sales_phone_calls c
    where c.id = sales_phone_tasks.call_id
      and public.sales_phone_call_visible(c)
  )
);

drop policy if exists "sales_phone_tasks_insert" on public.sales_phone_tasks;
create policy "sales_phone_tasks_insert"
on public.sales_phone_tasks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.sales_phone_calls c
    where c.id = sales_phone_tasks.call_id
      and public.sales_phone_call_visible(c)
  )
);

drop policy if exists "sales_phone_tasks_update" on public.sales_phone_tasks;
create policy "sales_phone_tasks_update"
on public.sales_phone_tasks
for update
to authenticated
using (
  exists (
    select 1
    from public.sales_phone_calls c
    where c.id = sales_phone_tasks.call_id
      and public.sales_phone_call_visible(c)
  )
)
with check (
  exists (
    select 1
    from public.sales_phone_calls c
    where c.id = sales_phone_tasks.call_id
      and public.sales_phone_call_visible(c)
  )
);

drop policy if exists "sales_phone_tasks_delete" on public.sales_phone_tasks;
create policy "sales_phone_tasks_delete"
on public.sales_phone_tasks
for delete
to authenticated
using (
  exists (
    select 1
    from public.sales_phone_calls c
    where c.id = sales_phone_tasks.call_id
      and public.sales_phone_call_visible(c)
  )
);
