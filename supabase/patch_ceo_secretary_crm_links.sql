-- -------------------------------------------------------------
-- CEO Office / CRM-Verknüpfungen
-- Verbindet private CEO-Notizen nur mit CRM-Referenzen (ohne
-- CRM-Inhalte zu kopieren). Idempotent ausfuehrbar.
-- -------------------------------------------------------------

create table if not exists public.ceo_secretary_entry_links (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.ceo_secretary_entries(id) on delete cascade,
  owner_user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('employee', 'company', 'provider')),
  entity_id text not null,
  entity_label text not null default '',
  created_at timestamptz not null default now(),
  unique (entry_id, entity_type, entity_id)
);

create index if not exists idx_ceo_secretary_entry_links_owner_entity
  on public.ceo_secretary_entry_links (owner_user_id, entity_type, entity_id);

create index if not exists idx_ceo_secretary_entry_links_entry
  on public.ceo_secretary_entry_links (entry_id);

alter table public.ceo_secretary_entry_links enable row level security;
grant select, insert, update, delete on public.ceo_secretary_entry_links to authenticated;

drop policy if exists "ceo_secretary_entry_links_owner_select" on public.ceo_secretary_entry_links;
create policy "ceo_secretary_entry_links_owner_select"
on public.ceo_secretary_entry_links for select to authenticated
using (public.is_superadmin() and owner_user_id = auth.uid());

drop policy if exists "ceo_secretary_entry_links_owner_insert" on public.ceo_secretary_entry_links;
create policy "ceo_secretary_entry_links_owner_insert"
on public.ceo_secretary_entry_links for insert to authenticated
with check (
  public.is_superadmin()
  and owner_user_id = auth.uid()
  and exists (
    select 1
    from public.ceo_secretary_entries entry
    where entry.id = entry_id
      and entry.created_by_user_id = auth.uid()
  )
);

drop policy if exists "ceo_secretary_entry_links_owner_update" on public.ceo_secretary_entry_links;
create policy "ceo_secretary_entry_links_owner_update"
on public.ceo_secretary_entry_links for update to authenticated
using (public.is_superadmin() and owner_user_id = auth.uid())
with check (
  public.is_superadmin()
  and owner_user_id = auth.uid()
  and exists (
    select 1
    from public.ceo_secretary_entries entry
    where entry.id = entry_id
      and entry.created_by_user_id = auth.uid()
  )
);

drop policy if exists "ceo_secretary_entry_links_owner_delete" on public.ceo_secretary_entry_links;
create policy "ceo_secretary_entry_links_owner_delete"
on public.ceo_secretary_entry_links for delete to authenticated
using (public.is_superadmin() and owner_user_id = auth.uid());

-- -------------------------------------------------------------
-- END FILE: supabase/patch_ceo_secretary_crm_links.sql
-- -------------------------------------------------------------
