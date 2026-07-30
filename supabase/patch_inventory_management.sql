-- Inventarverwaltung mit datenschutzkonformen Zugriffsrechten
-- Im Supabase SQL Editor ausführen.
-- Der Patch ist wiederholt ausführbar.
--
-- Rechte:
--   - Admin / Superadmin: vollständige Inventar- und Übergabeverwaltung
--   - Aktive Mitarbeitende: ausschließlich Leserechte auf aktuell eigenes
--     Inventar sowie die eigene Übergabehistorie

create extension if not exists pgcrypto;

create table if not exists public.company_inventory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  inventory_number text,
  manufacturer text not null default '',
  model text not null default '',
  serial_number text not null default '',
  status text not null default 'available'
    check (status in ('available', 'assigned', 'repair', 'retired', 'lost')),
  assigned_user_id uuid references auth.users(id) on delete set null,
  assigned_at date,
  planned_return_date date,
  location text not null default '',
  purchase_date date,
  warranty_until date,
  handover_notes text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  created_by_user_id uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  updated_by_user_id uuid references auth.users(id) on delete set null,
  constraint company_inventory_assigned_status_check
    check ((status = 'assigned') = (assigned_user_id is not null))
);

create unique index if not exists company_inventory_inventory_number_unique
  on public.company_inventory (inventory_number)
  where inventory_number is not null and btrim(inventory_number) <> '';

create index if not exists company_inventory_assigned_user_idx
  on public.company_inventory (assigned_user_id)
  where assigned_user_id is not null;

create index if not exists company_inventory_status_idx
  on public.company_inventory (status);

create table if not exists public.company_inventory_assignments (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.company_inventory(id) on delete cascade,
  employee_user_id uuid references auth.users(id) on delete set null,
  assigned_at date not null default current_date,
  returned_at date,
  handover_notes text not null default '',
  return_notes text not null default '',
  assigned_by_user_id uuid references auth.users(id) on delete set null,
  returned_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint company_inventory_assignments_return_date_check
    check (returned_at is null or returned_at >= assigned_at)
);

-- Pro Gegenstand darf es nur eine offene Übergabe geben.
create unique index if not exists company_inventory_one_open_assignment_unique
  on public.company_inventory_assignments (inventory_id)
  where returned_at is null;

create index if not exists company_inventory_assignments_employee_idx
  on public.company_inventory_assignments (employee_user_id, assigned_at desc);

create index if not exists company_inventory_assignments_inventory_idx
  on public.company_inventory_assignments (inventory_id, assigned_at desc);

create or replace function public.set_company_inventory_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists company_inventory_set_updated_at on public.company_inventory;
create trigger company_inventory_set_updated_at
before update on public.company_inventory
for each row execute function public.set_company_inventory_updated_at();

drop trigger if exists company_inventory_assignments_set_updated_at on public.company_inventory_assignments;
create trigger company_inventory_assignments_set_updated_at
before update on public.company_inventory_assignments
for each row execute function public.set_company_inventory_updated_at();

alter table public.company_inventory enable row level security;
alter table public.company_inventory_assignments enable row level security;

-- Tabellenzugriff für eingeloggte Nutzer freigeben; die RLS-Policies unten
-- begrenzen die sichtbaren/änderbaren Zeilen.
grant select, insert, update, delete on public.company_inventory to authenticated;
grant select, insert, update, delete on public.company_inventory_assignments to authenticated;

drop policy if exists "company_inventory_admin_all" on public.company_inventory;
create policy "company_inventory_admin_all"
on public.company_inventory
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "company_inventory_employee_select_own" on public.company_inventory;
create policy "company_inventory_employee_select_own"
on public.company_inventory
for select
to authenticated
using (
  assigned_user_id = auth.uid()
  and exists (
    select 1
    from public.profiles profile
    where profile.user_id::text = auth.uid()::text
      and profile.status = 'active'
  )
);

-- Inventarnummern folgen dem Format INV-JAHR-LAUFNUMMER, z. B.
-- INV-2026-0001. Eine mitgesendete Nummer bleibt für Datenmigrationen erhalten.
create sequence if not exists public.company_inventory_number_seq start with 1;

create or replace function public.assign_company_inventory_number()
returns trigger
language plpgsql
as $$
begin
  if coalesce(btrim(new.inventory_number), '') = '' then
    new.inventory_number := format(
      'INV-%s-%s',
      to_char(current_date, 'YYYY'),
      lpad(nextval('public.company_inventory_number_seq'::regclass)::text, 4, '0')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists company_inventory_assign_number on public.company_inventory;
create trigger company_inventory_assign_number
before insert on public.company_inventory
for each row execute function public.assign_company_inventory_number();

drop policy if exists "company_inventory_assignments_admin_all" on public.company_inventory_assignments;
create policy "company_inventory_assignments_admin_all"
on public.company_inventory_assignments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "company_inventory_assignments_employee_select_own" on public.company_inventory_assignments;
create policy "company_inventory_assignments_employee_select_own"
on public.company_inventory_assignments
for select
to authenticated
using (
  employee_user_id = auth.uid()
  and exists (
    select 1
    from public.profiles profile
    where profile.user_id::text = auth.uid()::text
      and profile.status = 'active'
  )
);

-- Praktische, sichere Sicht für Mitarbeitende: nur derzeit eigene Gegenstände.
create or replace view public.my_company_inventory
with (security_invoker = true)
as
select
  inventory.id,
  inventory.name,
  inventory.category,
  inventory.inventory_number,
  inventory.manufacturer,
  inventory.model,
  inventory.serial_number,
  inventory.assigned_at,
  inventory.planned_return_date,
  inventory.location,
  inventory.warranty_until,
  inventory.handover_notes
from public.company_inventory inventory
where inventory.assigned_user_id = auth.uid()
  and inventory.status = 'assigned';

grant select on public.my_company_inventory to authenticated;
