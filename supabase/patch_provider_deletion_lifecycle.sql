-- Anbieter: endgültiges Löschen und Archivierung sicher begrenzen.
-- Nach patch_provider_workflow_permissions.sql im Supabase SQL Editor ausführen.
-- Der Patch ist idempotent und prüft die Frist mit dem Server-Zeitstempel.

begin;

create or replace function public.is_superadmin()
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
      and p.role in ('superadmin', 'supaadmin')
  );
$$;

create or replace function public.is_active_sales_representative()
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
      and p.role = 'vertriebsmitarbeiter'
  );
$$;

create or replace function public.is_provider_new_status(status_value text)
returns boolean
language sql
immutable
as $$
  select regexp_replace(lower(trim(coalesce(status_value, 'offen'))), '[-[:space:]_]+', '_', 'g')
    in ('offen', 'neu', 'open', 'new');
$$;

create or replace function public.is_provider_archived_status(status_value text)
returns boolean
language sql
immutable
as $$
  select regexp_replace(lower(trim(coalesce(status_value, ''))), '[-[:space:]_]+', '_', 'g')
    in ('archiviert', 'archived', 'archive');
$$;

-- Ein Datensatz bleibt nur dann endgültig löschbar, wenn er stets „Neu“ war.
-- Der anfängliche History-Eintrag „leer → Offen“ zählt ausdrücklich nicht als
-- Statusänderung; jeder andere Zielstatus sperrt die Löschung dauerhaft.
create or replace function public.provider_status_has_changed(status_value text, payload_value jsonb)
returns boolean
language sql
immutable
as $$
  select
    not public.is_provider_new_status(coalesce(nullif(status_value, ''), payload_value ->> 'status', 'offen'))
    or exists (
      select 1
      from jsonb_array_elements(
        case
          when jsonb_typeof(payload_value -> 'statusHistory') = 'array' then payload_value -> 'statusHistory'
          when jsonb_typeof(payload_value -> 'status_history') = 'array' then payload_value -> 'status_history'
          else '[]'::jsonb
        end
      ) as history(entry)
      where not public.is_provider_new_status(
        coalesce(
          nullif(history.entry ->> 'toStatus', ''),
          nullif(history.entry ->> 'to_status', ''),
          nullif(history.entry ->> 'status', ''),
          'offen'
        )
      )
    );
$$;

-- Nur Superadmins dürfen endgültig löschen – und auch sie nur bei einem
-- unveränderten Neu-Datensatz innerhalb von 24 Stunden. Vertriebsmitarbeiter
-- dürfen ausschließlich eigene Neu-Datensätze innerhalb von 24 Stunden löschen.
drop policy if exists "providers_auth_delete" on public.providers;
create policy "providers_auth_delete"
on public.providers
for delete
to authenticated
using (
  (
    public.is_superadmin()
    and created_at >= now() - interval '24 hours'
    and not public.provider_status_has_changed(status, payload)
  )
  or (
    public.is_active_sales_representative()
    and created_by_user_id = auth.uid()::text
    and created_at >= now() - interval '24 hours'
    and not public.provider_status_has_changed(status, payload)
  )
);

-- Ein Archivstatus darf nur von Admin oder Superadmin gesetzt bzw. wieder
-- verändert werden. Für alle übrigen Workflow-Änderungen bleibt die bestehende
-- Claim-Regel erhalten.
drop policy if exists "providers_auth_update" on public.providers;
create policy "providers_auth_update"
on public.providers
for update
to authenticated
using (
  public.is_admin()
  or (
    public.is_active_provider_workflow_user()
    and not public.is_provider_archived_status(status)
    and (
      not public.is_provider_in_progress_status(status)
      or nullif(in_progress_by_user_id, '') = auth.uid()::text
    )
  )
)
with check (
  public.is_admin()
  or (
    public.is_active_provider_workflow_user()
    and not public.is_provider_archived_status(status)
    and (
      not public.is_provider_in_progress_status(status)
      or nullif(in_progress_by_user_id, '') = auth.uid()::text
    )
  )
);

commit;
