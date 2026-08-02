-- Anbieter-Workflow: „In Bearbeitung“ und Einladungen belastbar absichern.
-- Nach patch_providers_table.sql im Supabase SQL Editor ausführen.
-- Der Patch ist idempotent und übernimmt fehlende Legacy-Claims einmalig.

begin;

create or replace function public.is_provider_in_progress_status(status_value text)
returns boolean
language sql
immutable
as $$
  select regexp_replace(lower(trim(coalesce(status_value, ''))), '[-[:space:]_]+', '_', 'g')
    in ('erfasst', 'in_bearbeitung', 'in_progress', 'progress', 'bearbeitung', 'claimed');
$$;

create or replace function public.is_active_provider_workflow_user()
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
      and p.role in ('mitarbeiter', 'vertriebsmitarbeiter', 'admin', 'superadmin', 'supaadmin')
  );
$$;

-- Bei erneutem Ausführen darf der Backfill nicht an seinem eigenen
-- Claim-Trigger scheitern. Die Trigger werden am Ende des Patches direkt
-- wiederhergestellt; die Tabelle wird dabei nicht geöffnet oder umgebaut.
drop trigger if exists trg_providers_enforce_in_progress_claim on public.providers;
drop trigger if exists trg_providers_preserve_invitation_workflow on public.providers;

-- Ältere Datensätze konnten die Claim-Felder noch nicht enthalten. Die
-- aktuelle Statushistorie liefert dafür die beste vorhandene Zuordnung.
with latest_in_progress_history as (
  select
    p.id,
    (
      select history.entry
      from jsonb_array_elements(
        case
          when jsonb_typeof(p.payload -> 'statusHistory') = 'array' then p.payload -> 'statusHistory'
          when jsonb_typeof(p.payload -> 'status_history') = 'array' then p.payload -> 'status_history'
          else '[]'::jsonb
        end
      ) with ordinality as history(entry, position)
      where public.is_provider_in_progress_status(
        coalesce(
          nullif(history.entry ->> 'toStatus', ''),
          nullif(history.entry ->> 'to_status', ''),
          nullif(history.entry ->> 'status', ''),
          ''
        )
      )
      order by history.position desc
      limit 1
    ) as entry
  from public.providers p
  where public.is_provider_in_progress_status(coalesce(nullif(p.status, ''), p.payload ->> 'status'))
)
update public.providers p
set
  in_progress_by_user_id = coalesce(
    nullif(p.in_progress_by_user_id, ''),
    nullif(p.payload ->> 'inProgressByUserId', ''),
    nullif(p.payload ->> 'in_progress_by_user_id', ''),
    nullif(history.entry ->> 'byUserId', ''),
    nullif(history.entry ->> 'by_user_id', ''),
    nullif(history.entry ->> 'userId', ''),
    nullif(p.updated_by_user_id, ''),
    nullif(p.created_by_user_id, ''),
    ''
  ),
  in_progress_by_name = coalesce(
    nullif(p.in_progress_by_name, ''),
    nullif(p.payload ->> 'inProgressByName', ''),
    nullif(p.payload ->> 'in_progress_by_name', ''),
    nullif(history.entry ->> 'byName', ''),
    nullif(history.entry ->> 'by_name', ''),
    nullif(history.entry ->> 'userName', ''),
    nullif(history.entry ->> 'name', ''),
    nullif(p.updated_by_name, ''),
    nullif(p.created_by_name, ''),
    ''
  ),
  in_progress_by_role = coalesce(
    nullif(p.in_progress_by_role, ''),
    nullif(p.payload ->> 'inProgressByRole', ''),
    nullif(p.payload ->> 'in_progress_by_role', ''),
    nullif(history.entry ->> 'byRole', ''),
    nullif(history.entry ->> 'by_role', ''),
    nullif(history.entry ->> 'role', ''),
    nullif(p.updated_by_role, ''),
    nullif(p.created_by_role, ''),
    ''
  ),
  in_progress_at = coalesce(
    nullif(p.in_progress_at, ''),
    nullif(p.payload ->> 'inProgressAt', ''),
    nullif(p.payload ->> 'in_progress_at', ''),
    nullif(history.entry ->> 'at', ''),
    nullif(history.entry ->> 'changedAt', ''),
    nullif(history.entry ->> 'changed_at', ''),
    nullif(history.entry ->> 'timestamp', ''),
    nullif(p.source_updated_at, ''),
    nullif(p.source_created_at, ''),
    ''
  )
from latest_in_progress_history history
where p.id = history.id;

-- RLS ergänzt die UI-Prüfung. Bei einem bestehenden In-Bearbeitung-Datensatz
-- darf nur dessen Claim-Inhaber schreiben; Admin und Superadmin behalten den
-- vollständigen Zugriff. Beim Übergang *nach* In Bearbeitung muss der Claim
-- des normalen Mitarbeiters zwingend auf die eigene User-ID zeigen.
alter table public.providers enable row level security;

-- Der Browser verifiziert jeden interaktiven Anbieter-Save mit einem neuen
-- SELECT. Ohne diese Policy kann ein Write trotz erfolgreicher Datenänderung
-- nicht bestätigt werden und würde im UI fälschlich als nicht gespeichert
-- erscheinen. Alle aktiven Rollen (inkl. Vertrieb) dürfen lesen; Schreib-
-- rechte bleiben in den folgenden, engeren Policies geregelt.
drop policy if exists "providers_auth_select" on public.providers;
create policy "providers_auth_select"
on public.providers
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id::text = auth.uid()::text
      and p.status = 'active'
  )
);

drop policy if exists "providers_auth_insert" on public.providers;
create policy "providers_auth_insert"
on public.providers
for insert
to authenticated
with check (
  public.is_admin()
  or (
    public.is_active_provider_workflow_user()
    and (
      not public.is_provider_in_progress_status(status)
      or nullif(in_progress_by_user_id, '') = auth.uid()::text
    )
  )
);

drop policy if exists "providers_auth_update" on public.providers;
create policy "providers_auth_update"
on public.providers
for update
to authenticated
using (
  public.is_admin()
  or (
    public.is_active_provider_workflow_user()
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
    and (
      not public.is_provider_in_progress_status(status)
      or nullif(in_progress_by_user_id, '') = auth.uid()::text
    )
  )
);

drop policy if exists "providers_auth_delete" on public.providers;
create policy "providers_auth_delete"
on public.providers
for delete
to authenticated
using (
  public.is_admin()
  or (
    public.is_active_provider_workflow_user()
    and created_by_user_id = auth.uid()::text
    and (
      not public.is_provider_in_progress_status(status)
      or nullif(in_progress_by_user_id, '') = auth.uid()::text
    )
  )
);

-- Die Policies liefern direkt eine Berechtigungsantwort. Der Trigger schützt
-- zusätzlich gegen manipulierte Upserts und stellt die Claim-Invariante auch
-- dann sicher, wenn ein anderer Client die Tabelle direkt anspricht.
create or replace function public.enforce_provider_in_progress_claim()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor_user_id text := coalesce(auth.uid()::text, '');
  is_service_role boolean := coalesce(auth.role(), '') = 'service_role';
begin
  if is_service_role then
    return new;
  end if;

  if not public.is_active_provider_workflow_user() then
    raise exception using
      errcode = '42501',
      message = 'Nur aktive Benutzer dürfen Anbieter ändern.';
  end if;

  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if public.is_provider_in_progress_status(new.status)
      and nullif(new.in_progress_by_user_id, '') is distinct from actor_user_id then
      raise exception using
        errcode = '42501',
        message = 'Der In-Bearbeitung-Claim muss dem ausführenden Benutzer gehören.';
    end if;
    return new;
  end if;

  if public.is_provider_in_progress_status(old.status)
    and nullif(old.in_progress_by_user_id, '') is distinct from actor_user_id then
    raise exception using
      errcode = '42501',
      message = 'Dieser Anbieter wird von einem anderen Benutzer bearbeitet.';
  end if;

  if public.is_provider_in_progress_status(new.status)
    and nullif(new.in_progress_by_user_id, '') is distinct from actor_user_id then
    raise exception using
      errcode = '42501',
      message = 'Der In-Bearbeitung-Claim muss dem ausführenden Benutzer gehören.';
  end if;

  return new;
end;
$$;

create trigger trg_providers_enforce_in_progress_claim
before insert or update on public.providers
for each row execute procedure public.enforce_provider_in_progress_claim();

-- Einladungsfelder werden ausschließlich über die serverseitigen Endpunkte
-- verändert. Ein älteres, noch offenes Anbieterformular darf beim normalen
-- Speichern keinen gerade geänderten Einladungsauftrag überschreiben.
create or replace function public.preserve_provider_invitation_workflow_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invitation_fields text[] := array[
    'invitationRequestStatus', 'invitation_request_status',
    'invitationRequestedAt', 'invitation_requested_at',
    'invitationRequestedByUserId', 'invitation_requested_by_user_id',
    'invitationRequestedByName', 'invitation_requested_by_name',
    'invitationRequestedByRole', 'invitation_requested_by_role',
    'invitationInProgressAt', 'invitation_in_progress_at',
    'invitationInProgressByUserId', 'invitation_in_progress_by_user_id',
    'invitationInProgressByName', 'invitation_in_progress_by_name',
    'invitationInProgressByRole', 'invitation_in_progress_by_role',
    'invitationCompletedAt', 'invitation_completed_at',
    'invitationCompletedByUserId', 'invitation_completed_by_user_id',
    'invitationCompletedByName', 'invitation_completed_by_name',
    'invitationCompletedByRole', 'invitation_completed_by_role'
  ];
  field_name text;
  old_payload jsonb;
  next_payload jsonb := coalesce(new.payload, '{}'::jsonb);
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    foreach field_name in array invitation_fields loop
      next_payload := next_payload - field_name;
    end loop;
    new.payload := next_payload;
    return new;
  end if;

  old_payload := coalesce(old.payload, '{}'::jsonb);
  foreach field_name in array invitation_fields loop
    if old_payload ? field_name then
      next_payload := jsonb_set(next_payload, array[field_name], old_payload -> field_name, true);
    else
      next_payload := next_payload - field_name;
    end if;
  end loop;
  new.payload := next_payload;
  return new;
end;
$$;

create trigger trg_providers_preserve_invitation_workflow
before insert or update on public.providers
for each row execute procedure public.preserve_provider_invitation_workflow_fields();

commit;
