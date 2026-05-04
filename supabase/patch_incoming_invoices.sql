-- Eingangsrechnungen: Schema + RLS + Basis-Audit
-- Ziel: Freigabe-offene und bereits bezahlte Rechnungen zentral verwalten
-- Hinweis: Dateiinhalte liegen auf NAS, in der DB wird nur Metadaten + NAS-Pfad gespeichert.

create extension if not exists pgcrypto;

create table if not exists public.incoming_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null default '',
  supplier_company_id text not null default '',
  supplier_name text not null default '',
  supplier_vat_id text not null default '',
  supplier_iban text not null default '',
  invoice_date date not null,
  due_date date,
  currency text not null default 'EUR' check (currency ~ '^[A-Z]{3}$'),
  total_net numeric(14,2) not null default 0 check (total_net >= 0),
  total_tax numeric(14,2) not null default 0 check (total_tax >= 0),
  total_gross numeric(14,2) not null default 0 check (total_gross >= 0),
  category text not null default 'Sonstiges',
  cost_center text not null default '',
  project_code text not null default '',
  approval_status text not null default 'freigabe_offen'
    check (approval_status in ('freigabe_offen', 'freigegeben', 'abgelehnt', 'nicht_noetig')),
  payment_status text not null default 'offen'
    check (payment_status in ('offen', 'teilbezahlt', 'bezahlt')),
  paid_at timestamptz,
  payment_method text not null default ''
    check (payment_method in ('', 'ueberweisung', 'lastschrift', 'kreditkarte', 'bar', 'sonstiges')),
  external_booking_ref text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  approved_by_user_id uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejected_by_user_id uuid references auth.users(id) on delete set null,
  rejected_reason text not null default ''
);

create table if not exists public.incoming_invoice_files (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.incoming_invoices(id) on delete cascade,
  storage_mode text not null default 'nas' check (storage_mode in ('nas', 'supabase')),
  nas_path text not null default '',
  original_name text not null default '',
  mime_type text not null default 'application/pdf',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  checksum_sha256 text not null default '',
  uploaded_at timestamptz not null default now(),
  uploaded_by_user_id uuid references auth.users(id) on delete set null,
  check (
    (storage_mode = 'nas' and length(trim(coalesce(nas_path, ''))) > 0)
    or (storage_mode = 'supabase')
  )
);

create table if not exists public.incoming_invoice_approvers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null
);

create table if not exists public.incoming_invoice_events (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.incoming_invoices(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'created',
      'updated',
      'approval_submitted',
      'approved',
      'rejected',
      'marked_paid',
      'payment_reopened',
      'file_added',
      'file_removed'
    )
  ),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null
);

create index if not exists idx_incoming_invoices_statuses
  on public.incoming_invoices (approval_status, payment_status);

create index if not exists idx_incoming_invoices_due_date
  on public.incoming_invoices (due_date);

create index if not exists idx_incoming_invoices_invoice_date
  on public.incoming_invoices (invoice_date);

create index if not exists idx_incoming_invoices_supplier
  on public.incoming_invoices (supplier_name);

create index if not exists idx_incoming_invoices_supplier_company_id
  on public.incoming_invoices (supplier_company_id);

create index if not exists idx_incoming_invoice_files_invoice_id
  on public.incoming_invoice_files (invoice_id);

create index if not exists idx_incoming_invoice_events_invoice_id_created_at
  on public.incoming_invoice_events (invoice_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_incoming_invoices_updated_at on public.incoming_invoices;
create trigger trg_incoming_invoices_updated_at
before update on public.incoming_invoices
for each row execute procedure public.set_updated_at();

create or replace function public.is_active_employee()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id::text = auth.uid()::text
      and p.status = 'active'
  );
$$;

create or replace function public.is_invoice_approver()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.is_admin()
    or exists (
      select 1
      from public.incoming_invoice_approvers a
      where a.user_id::text = auth.uid()::text
        and a.is_active = true
    ),
    false
  );
$$;

create or replace function public.enforce_invoice_status_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.approval_status in ('freigegeben', 'abgelehnt')
       and new.approval_status is distinct from old.approval_status
       and not public.is_invoice_approver() then
      raise exception 'Nur freigabeberechtigte Benutzer duerfen den Freigabestatus setzen.';
    end if;

    if new.payment_status = 'bezahlt'
       and new.payment_status is distinct from old.payment_status
       and new.approval_status = 'freigabe_offen' then
      raise exception 'Rechnung kann nicht als bezahlt markiert werden, solange die Freigabe offen ist.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_incoming_invoices_permission_guard on public.incoming_invoices;
create trigger trg_incoming_invoices_permission_guard
before update on public.incoming_invoices
for each row execute procedure public.enforce_invoice_status_permissions();

create or replace function public.log_incoming_invoice_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ev_type text;
  ev_payload jsonb;
begin
  if tg_op = 'INSERT' then
    ev_type := 'created';
    ev_payload := jsonb_build_object('approval_status', new.approval_status, 'payment_status', new.payment_status);
  elsif tg_op = 'UPDATE' then
    ev_type := 'updated';
    ev_payload := jsonb_build_object(
      'approval_status_before', old.approval_status,
      'approval_status_after', new.approval_status,
      'payment_status_before', old.payment_status,
      'payment_status_after', new.payment_status
    );

    if new.approval_status is distinct from old.approval_status and new.approval_status = 'freigegeben' then
      ev_type := 'approved';
    elsif new.approval_status is distinct from old.approval_status and new.approval_status = 'abgelehnt' then
      ev_type := 'rejected';
    elsif new.payment_status is distinct from old.payment_status and new.payment_status = 'bezahlt' then
      ev_type := 'marked_paid';
    elsif new.payment_status is distinct from old.payment_status and old.payment_status = 'bezahlt' then
      ev_type := 'payment_reopened';
    end if;
  else
    return new;
  end if;

  insert into public.incoming_invoice_events (invoice_id, event_type, payload, created_by_user_id)
  values (new.id, ev_type, coalesce(ev_payload, '{}'::jsonb), auth.uid());

  return new;
end;
$$;

drop trigger if exists trg_incoming_invoices_event_log on public.incoming_invoices;
create trigger trg_incoming_invoices_event_log
after insert or update on public.incoming_invoices
for each row execute procedure public.log_incoming_invoice_change();

alter table public.incoming_invoices enable row level security;
alter table public.incoming_invoice_files enable row level security;
alter table public.incoming_invoice_approvers enable row level security;
alter table public.incoming_invoice_events enable row level security;

drop policy if exists "incoming_invoices_active_select" on public.incoming_invoices;
create policy "incoming_invoices_active_select"
on public.incoming_invoices
for select
to authenticated
using (public.is_active_employee());

drop policy if exists "incoming_invoices_active_insert" on public.incoming_invoices;
create policy "incoming_invoices_active_insert"
on public.incoming_invoices
for insert
to authenticated
with check (public.is_active_employee());

drop policy if exists "incoming_invoices_active_update" on public.incoming_invoices;
create policy "incoming_invoices_active_update"
on public.incoming_invoices
for update
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

drop policy if exists "incoming_invoices_admin_delete" on public.incoming_invoices;
create policy "incoming_invoices_admin_delete"
on public.incoming_invoices
for delete
to authenticated
using (public.is_admin());

drop policy if exists "incoming_invoice_files_active_select" on public.incoming_invoice_files;
create policy "incoming_invoice_files_active_select"
on public.incoming_invoice_files
for select
to authenticated
using (
  public.is_active_employee()
  and exists (
    select 1
    from public.incoming_invoices i
    where i.id = incoming_invoice_files.invoice_id
  )
);

drop policy if exists "incoming_invoice_files_active_insert" on public.incoming_invoice_files;
create policy "incoming_invoice_files_active_insert"
on public.incoming_invoice_files
for insert
to authenticated
with check (
  public.is_active_employee()
  and exists (
    select 1
    from public.incoming_invoices i
    where i.id = incoming_invoice_files.invoice_id
  )
);

drop policy if exists "incoming_invoice_files_active_delete" on public.incoming_invoice_files;
create policy "incoming_invoice_files_active_delete"
on public.incoming_invoice_files
for delete
to authenticated
using (public.is_active_employee());

drop policy if exists "incoming_invoice_approvers_admin_select" on public.incoming_invoice_approvers;
create policy "incoming_invoice_approvers_admin_select"
on public.incoming_invoice_approvers
for select
to authenticated
using (public.is_admin());

drop policy if exists "incoming_invoice_approvers_admin_insert" on public.incoming_invoice_approvers;
create policy "incoming_invoice_approvers_admin_insert"
on public.incoming_invoice_approvers
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "incoming_invoice_approvers_admin_update" on public.incoming_invoice_approvers;
create policy "incoming_invoice_approvers_admin_update"
on public.incoming_invoice_approvers
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "incoming_invoice_approvers_admin_delete" on public.incoming_invoice_approvers;
create policy "incoming_invoice_approvers_admin_delete"
on public.incoming_invoice_approvers
for delete
to authenticated
using (public.is_admin());

drop policy if exists "incoming_invoice_events_active_select" on public.incoming_invoice_events;
create policy "incoming_invoice_events_active_select"
on public.incoming_invoice_events
for select
to authenticated
using (public.is_active_employee());

drop policy if exists "incoming_invoice_events_active_insert" on public.incoming_invoice_events;
create policy "incoming_invoice_events_active_insert"
on public.incoming_invoice_events
for insert
to authenticated
with check (public.is_active_employee());

create or replace view public.v_invoices_pending_approval as
select *
from public.incoming_invoices
where approval_status = 'freigabe_offen'
  and payment_status <> 'bezahlt';

create or replace view public.v_invoices_paid as
select *
from public.incoming_invoices
where payment_status = 'bezahlt';
