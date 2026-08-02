-- Dedizierte Tabelle fuer Anbieter-Stammdaten.
-- Migriert bestehende Anbieter aus public.app_state.payload.providers.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.providers (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  name text not null default '',
  status text not null default '',
  address text not null default '',
  postal_code text not null default '',
  city text not null default '',
  state text not null default '',
  country text not null default '',
  website text not null default '',
  email text not null default '',
  phone text not null default '',
  contact_salutation text not null default '',
  contact_title text not null default '',
  contact_first_name text not null default '',
  contact_last_name text not null default '',
  contact_person text not null default '',
  contact_person_phone text not null default '',
  contact_person_email text not null default '',
  admin_only boolean not null default false,
  dashboard_created boolean not null default false,
  early_partner boolean not null default false,
  online_only boolean not null default false,
  topic_ids jsonb not null default '[]'::jsonb,
  locations jsonb not null default '[]'::jsonb,
  coverage_mode text not null default 'locations',
  coverage_country text not null default '',
  coverage_states jsonb not null default '[]'::jsonb,
  partner_request_redemption_method text not null default '',
  partner_request_message text not null default '',
  notes jsonb not null default '[]'::jsonb,
  status_history jsonb not null default '[]'::jsonb,
  latitude double precision,
  longitude double precision,
  source_created_at text not null default '',
  created_by_name text not null default '',
  created_by_role text not null default '',
  created_by_user_id text not null default '',
  source_updated_at text not null default '',
  updated_by_name text not null default '',
  updated_by_role text not null default '',
  updated_by_user_id text not null default '',
  responsible_user_id text not null default '',
  responsible_name text not null default '',
  responsible_role text not null default '',
  responsibility_source text not null default '',
  responsibility_updated_at text not null default '',
  responsibility_acceptance_status text not null default '',
  responsibility_transferred_by_user_id text not null default '',
  responsibility_transferred_by_name text not null default '',
  responsibility_transferred_by_role text not null default '',
  responsibility_previous_user_id text not null default '',
  responsibility_previous_name text not null default '',
  responsibility_previous_role text not null default '',
  responsibility_previous_source text not null default '',
  responsibility_previous_updated_at text not null default '',
  responsibility_transfer_request_id text not null default '',
  responsibility_transfer_request_persisted_id text not null default '',
  responsibility_transfer_notification_id text not null default '',
  responsibility_accepted_at text not null default '',
  responsibility_rejected_at text not null default '',
  responsibility_rejection_reason text not null default '',
  responsibility_rejected_by_user_id text not null default '',
  responsibility_rejected_by_name text not null default '',
  responsibility_rejected_by_role text not null default '',
  in_progress_by_user_id text not null default '',
  in_progress_by_name text not null default '',
  in_progress_by_role text not null default '',
  in_progress_at text not null default '',
  live_at text not null default '',
  live_requested_at text not null default '',
  live_requested_by_user_id text not null default '',
  live_requested_by_name text not null default '',
  live_requested_by_role text not null default '',
  live_by_name text not null default '',
  live_by_role text not null default '',
  live_by_user_id text not null default '',
  provision_user_id text not null default '',
  provision_user_name text not null default '',
  provision_user_role text not null default '',
  provision_assigned_at text not null default '',
  current_provision_credit_entry_id text not null default '',
  current_provision_booked_at text not null default '',
  current_provision_amount_eur numeric(12,2) not null default 0,
  source_partner_request_id text not null default '',
  source_partner_request_persisted_id text not null default '',
  source_partner_request_notification_id text not null default '',
  linked_partner_request_ids jsonb not null default '[]'::jsonb,
  linked_partner_request_persisted_ids jsonb not null default '[]'::jsonb,
  linked_partner_request_notification_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.providers
  add column if not exists name text not null default '',
  add column if not exists status text not null default '',
  add column if not exists address text not null default '',
  add column if not exists postal_code text not null default '',
  add column if not exists city text not null default '',
  add column if not exists state text not null default '',
  add column if not exists country text not null default '',
  add column if not exists website text not null default '',
  add column if not exists email text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists contact_salutation text not null default '',
  add column if not exists contact_title text not null default '',
  add column if not exists contact_first_name text not null default '',
  add column if not exists contact_last_name text not null default '',
  add column if not exists contact_person text not null default '',
  add column if not exists contact_person_phone text not null default '',
  add column if not exists contact_person_email text not null default '',
  add column if not exists admin_only boolean not null default false,
  add column if not exists dashboard_created boolean not null default false,
  add column if not exists early_partner boolean not null default false,
  add column if not exists online_only boolean not null default false,
  add column if not exists topic_ids jsonb not null default '[]'::jsonb,
  add column if not exists locations jsonb not null default '[]'::jsonb,
  add column if not exists coverage_mode text not null default 'locations',
  add column if not exists coverage_country text not null default '',
  add column if not exists coverage_states jsonb not null default '[]'::jsonb,
  add column if not exists partner_request_redemption_method text not null default '',
  add column if not exists partner_request_message text not null default '',
  add column if not exists notes jsonb not null default '[]'::jsonb,
  add column if not exists status_history jsonb not null default '[]'::jsonb,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists source_created_at text not null default '',
  add column if not exists created_by_name text not null default '',
  add column if not exists created_by_role text not null default '',
  add column if not exists created_by_user_id text not null default '',
  add column if not exists source_updated_at text not null default '',
  add column if not exists updated_by_name text not null default '',
  add column if not exists updated_by_role text not null default '',
  add column if not exists updated_by_user_id text not null default '',
  add column if not exists responsible_user_id text not null default '',
  add column if not exists responsible_name text not null default '',
  add column if not exists responsible_role text not null default '',
  add column if not exists responsibility_source text not null default '',
  add column if not exists responsibility_updated_at text not null default '',
  add column if not exists responsibility_acceptance_status text not null default '',
  add column if not exists responsibility_transferred_by_user_id text not null default '',
  add column if not exists responsibility_transferred_by_name text not null default '',
  add column if not exists responsibility_transferred_by_role text not null default '',
  add column if not exists responsibility_previous_user_id text not null default '',
  add column if not exists responsibility_previous_name text not null default '',
  add column if not exists responsibility_previous_role text not null default '',
  add column if not exists responsibility_previous_source text not null default '',
  add column if not exists responsibility_previous_updated_at text not null default '',
  add column if not exists responsibility_transfer_request_id text not null default '',
  add column if not exists responsibility_transfer_request_persisted_id text not null default '',
  add column if not exists responsibility_transfer_notification_id text not null default '',
  add column if not exists responsibility_accepted_at text not null default '',
  add column if not exists responsibility_rejected_at text not null default '',
  add column if not exists responsibility_rejection_reason text not null default '',
  add column if not exists responsibility_rejected_by_user_id text not null default '',
  add column if not exists responsibility_rejected_by_name text not null default '',
  add column if not exists responsibility_rejected_by_role text not null default '',
  add column if not exists in_progress_by_user_id text not null default '',
  add column if not exists in_progress_by_name text not null default '',
  add column if not exists in_progress_by_role text not null default '',
  add column if not exists in_progress_at text not null default '',
  add column if not exists live_at text not null default '',
  add column if not exists live_requested_at text not null default '',
  add column if not exists live_requested_by_user_id text not null default '',
  add column if not exists live_requested_by_name text not null default '',
  add column if not exists live_requested_by_role text not null default '',
  add column if not exists live_by_name text not null default '',
  add column if not exists live_by_role text not null default '',
  add column if not exists live_by_user_id text not null default '',
  add column if not exists provision_user_id text not null default '',
  add column if not exists provision_user_name text not null default '',
  add column if not exists provision_user_role text not null default '',
  add column if not exists provision_assigned_at text not null default '',
  add column if not exists current_provision_credit_entry_id text not null default '',
  add column if not exists current_provision_booked_at text not null default '',
  add column if not exists current_provision_amount_eur numeric(12,2) not null default 0,
  add column if not exists source_partner_request_id text not null default '',
  add column if not exists source_partner_request_persisted_id text not null default '',
  add column if not exists source_partner_request_notification_id text not null default '',
  add column if not exists linked_partner_request_ids jsonb not null default '[]'::jsonb,
  add column if not exists linked_partner_request_persisted_ids jsonb not null default '[]'::jsonb,
  add column if not exists linked_partner_request_notification_ids jsonb not null default '[]'::jsonb;

create index if not exists idx_providers_updated_at on public.providers (updated_at desc);
create index if not exists idx_providers_status on public.providers (status);
create index if not exists idx_providers_country on public.providers (country);
create index if not exists idx_providers_responsible_user_id on public.providers (responsible_user_id);

drop trigger if exists trg_providers_updated_at on public.providers;
create trigger trg_providers_updated_at
before update on public.providers
for each row execute procedure public.set_updated_at();

alter table public.providers enable row level security;

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
  exists (
    select 1
    from public.profiles p
    where p.user_id::text = auth.uid()::text
      and p.status = 'active'
  )
);

drop policy if exists "providers_auth_update" on public.providers;
create policy "providers_auth_update"
on public.providers
for update
to authenticated
using (
  public.is_admin()
  or responsible_user_id = auth.uid()::text
  or created_by_user_id = auth.uid()::text
  or exists (
      select 1
      from public.profiles p
      where p.user_id::text = auth.uid()::text
        and p.status = 'active'
        and p.role in ('mitarbeiter', 'vertriebsmitarbeiter')
    )
)
with check (
  public.is_admin()
  or responsible_user_id = auth.uid()::text
  or created_by_user_id = auth.uid()::text
  or exists (
      select 1
      from public.profiles p
      where p.user_id::text = auth.uid()::text
        and p.status = 'active'
        and p.role in ('mitarbeiter', 'vertriebsmitarbeiter')
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
    created_by_user_id = auth.uid()::text
    and exists (
      select 1
      from public.profiles p
      where p.user_id::text = auth.uid()::text
        and p.status = 'active'
    )
  )
);

insert into public.providers (id, payload, created_at, updated_at)
select
  provider_entry.provider ->> 'id' as id,
  provider_entry.provider as payload,
  coalesce(nullif(provider_entry.provider ->> 'createdAt', '')::timestamptz, now()) as created_at,
  coalesce(nullif(provider_entry.provider ->> 'updatedAt', '')::timestamptz, now()) as updated_at
from public.app_state state_row
cross join lateral jsonb_array_elements(coalesce(state_row.payload -> 'providers', '[]'::jsonb)) as provider_entry(provider)
where state_row.id = 'main'
  and coalesce(provider_entry.provider ->> 'id', '') <> ''
on conflict (id) do nothing;

update public.providers
set
  name = coalesce(payload ->> 'name', name, ''),
  status = coalesce(payload ->> 'status', status, ''),
  address = coalesce(payload ->> 'address', address, ''),
  postal_code = coalesce(payload ->> 'postalCode', payload ->> 'postal_code', postal_code, ''),
  city = coalesce(payload ->> 'city', city, ''),
  state = coalesce(payload ->> 'state', state, ''),
  country = coalesce(payload ->> 'country', country, ''),
  website = coalesce(payload ->> 'website', website, ''),
  email = coalesce(payload ->> 'email', email, ''),
  phone = coalesce(payload ->> 'phone', phone, ''),
  contact_salutation = coalesce(payload ->> 'contactSalutation', payload ->> 'contact_salutation', contact_salutation, ''),
  contact_title = coalesce(payload ->> 'contactTitle', payload ->> 'contact_title', contact_title, ''),
  contact_first_name = coalesce(payload ->> 'contactFirstName', payload ->> 'contact_first_name', contact_first_name, ''),
  contact_last_name = coalesce(payload ->> 'contactLastName', payload ->> 'contact_last_name', contact_last_name, ''),
  contact_person = coalesce(payload ->> 'contactPerson', payload ->> 'contact_person', contact_person, ''),
  contact_person_phone = coalesce(payload ->> 'contactPersonPhone', payload ->> 'contact_person_phone', contact_person_phone, ''),
  contact_person_email = coalesce(payload ->> 'contactPersonEmail', payload ->> 'contact_person_email', contact_person_email, ''),
  admin_only = lower(coalesce(payload ->> 'adminOnly', payload ->> 'admin_only', 'false')) in ('true', 't', '1', 'yes'),
  dashboard_created = lower(coalesce(payload ->> 'dashboardCreated', payload ->> 'dashboard_created', 'false')) in ('true', 't', '1', 'yes'),
  early_partner = lower(coalesce(payload ->> 'earlyPartner', payload ->> 'early_partner', 'false')) in ('true', 't', '1', 'yes'),
  online_only = lower(coalesce(payload ->> 'onlineOnly', payload ->> 'online_only', 'false')) in ('true', 't', '1', 'yes'),
  topic_ids = case
    when jsonb_typeof(payload -> 'topicIds') = 'array' then payload -> 'topicIds'
    else '[]'::jsonb
  end,
  locations = case
    when jsonb_typeof(payload -> 'locations') = 'array' then payload -> 'locations'
    else '[]'::jsonb
  end,
  coverage_mode = coalesce(payload ->> 'coverageMode', payload ->> 'coverage_mode', coverage_mode, 'locations'),
  coverage_country = coalesce(payload ->> 'coverageCountry', payload ->> 'coverage_country', coverage_country, ''),
  coverage_states = case
    when jsonb_typeof(payload -> 'coverageStates') = 'array' then payload -> 'coverageStates'
    when jsonb_typeof(payload -> 'coverage_states') = 'array' then payload -> 'coverage_states'
    else '[]'::jsonb
  end,
  partner_request_redemption_method = coalesce(
    payload ->> 'partnerRequestRedemptionMethod',
    payload ->> 'partner_request_redemption_method',
    partner_request_redemption_method,
    ''
  ),
  partner_request_message = coalesce(
    payload ->> 'partnerRequestMessage',
    payload ->> 'partner_request_message',
    partner_request_message,
    ''
  ),
  notes = case
    when jsonb_typeof(payload -> 'notes') = 'array' then payload -> 'notes'
    else '[]'::jsonb
  end,
  status_history = case
    when jsonb_typeof(payload -> 'statusHistory') = 'array' then payload -> 'statusHistory'
    when jsonb_typeof(payload -> 'status_history') = 'array' then payload -> 'status_history'
    else '[]'::jsonb
  end,
  latitude = case
    when coalesce(payload ->> 'latitude', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
      then (payload ->> 'latitude')::double precision
    else null
  end,
  longitude = case
    when coalesce(payload ->> 'longitude', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
      then (payload ->> 'longitude')::double precision
    else null
  end,
  source_created_at = coalesce(payload ->> 'createdAt', source_created_at, ''),
  created_by_name = coalesce(payload ->> 'createdByName', created_by_name, ''),
  created_by_role = coalesce(payload ->> 'createdByRole', created_by_role, ''),
  created_by_user_id = coalesce(payload ->> 'createdByUserId', created_by_user_id, ''),
  source_updated_at = coalesce(payload ->> 'updatedAt', source_updated_at, ''),
  updated_by_name = coalesce(payload ->> 'updatedByName', updated_by_name, ''),
  updated_by_role = coalesce(payload ->> 'updatedByRole', updated_by_role, ''),
  updated_by_user_id = coalesce(payload ->> 'updatedByUserId', updated_by_user_id, ''),
  responsible_user_id = coalesce(payload ->> 'responsibleUserId', payload ->> 'responsible_user_id', responsible_user_id, ''),
  responsible_name = coalesce(payload ->> 'responsibleName', payload ->> 'responsible_name', responsible_name, ''),
  responsible_role = coalesce(payload ->> 'responsibleRole', payload ->> 'responsible_role', responsible_role, ''),
  responsibility_source = coalesce(payload ->> 'responsibilitySource', payload ->> 'responsibility_source', responsibility_source, ''),
  responsibility_updated_at = coalesce(
    payload ->> 'responsibilityUpdatedAt',
    payload ->> 'responsibility_updated_at',
    responsibility_updated_at,
    ''
  ),
  responsibility_acceptance_status = coalesce(
    payload ->> 'responsibilityAcceptanceStatus',
    payload ->> 'responsibility_acceptance_status',
    responsibility_acceptance_status,
    ''
  ),
  responsibility_transferred_by_user_id = coalesce(
    payload ->> 'responsibilityTransferredByUserId',
    payload ->> 'responsibility_transferred_by_user_id',
    responsibility_transferred_by_user_id,
    ''
  ),
  responsibility_transferred_by_name = coalesce(
    payload ->> 'responsibilityTransferredByName',
    payload ->> 'responsibility_transferred_by_name',
    responsibility_transferred_by_name,
    ''
  ),
  responsibility_transferred_by_role = coalesce(
    payload ->> 'responsibilityTransferredByRole',
    payload ->> 'responsibility_transferred_by_role',
    responsibility_transferred_by_role,
    ''
  ),
  responsibility_previous_user_id = coalesce(
    payload ->> 'responsibilityPreviousUserId',
    payload ->> 'responsibility_previous_user_id',
    responsibility_previous_user_id,
    ''
  ),
  responsibility_previous_name = coalesce(
    payload ->> 'responsibilityPreviousName',
    payload ->> 'responsibility_previous_name',
    responsibility_previous_name,
    ''
  ),
  responsibility_previous_role = coalesce(
    payload ->> 'responsibilityPreviousRole',
    payload ->> 'responsibility_previous_role',
    responsibility_previous_role,
    ''
  ),
  responsibility_previous_source = coalesce(
    payload ->> 'responsibilityPreviousSource',
    payload ->> 'responsibility_previous_source',
    responsibility_previous_source,
    ''
  ),
  responsibility_previous_updated_at = coalesce(
    payload ->> 'responsibilityPreviousUpdatedAt',
    payload ->> 'responsibility_previous_updated_at',
    responsibility_previous_updated_at,
    ''
  ),
  responsibility_transfer_request_id = coalesce(
    payload ->> 'responsibilityTransferRequestId',
    payload ->> 'responsibility_transfer_request_id',
    responsibility_transfer_request_id,
    ''
  ),
  responsibility_transfer_request_persisted_id = coalesce(
    payload ->> 'responsibilityTransferRequestPersistedId',
    payload ->> 'responsibility_transfer_request_persisted_id',
    responsibility_transfer_request_persisted_id,
    ''
  ),
  responsibility_transfer_notification_id = coalesce(
    payload ->> 'responsibilityTransferNotificationId',
    payload ->> 'responsibility_transfer_notification_id',
    responsibility_transfer_notification_id,
    ''
  ),
  responsibility_accepted_at = coalesce(
    payload ->> 'responsibilityAcceptedAt',
    payload ->> 'responsibility_accepted_at',
    responsibility_accepted_at,
    ''
  ),
  responsibility_rejected_at = coalesce(
    payload ->> 'responsibilityRejectedAt',
    payload ->> 'responsibility_rejected_at',
    responsibility_rejected_at,
    ''
  ),
  responsibility_rejection_reason = coalesce(
    payload ->> 'responsibilityRejectionReason',
    payload ->> 'responsibility_rejection_reason',
    responsibility_rejection_reason,
    ''
  ),
  responsibility_rejected_by_user_id = coalesce(
    payload ->> 'responsibilityRejectedByUserId',
    payload ->> 'responsibility_rejected_by_user_id',
    responsibility_rejected_by_user_id,
    ''
  ),
  responsibility_rejected_by_name = coalesce(
    payload ->> 'responsibilityRejectedByName',
    payload ->> 'responsibility_rejected_by_name',
    responsibility_rejected_by_name,
    ''
  ),
  responsibility_rejected_by_role = coalesce(
    payload ->> 'responsibilityRejectedByRole',
    payload ->> 'responsibility_rejected_by_role',
    responsibility_rejected_by_role,
    ''
  ),
  in_progress_by_user_id = coalesce(payload ->> 'inProgressByUserId', payload ->> 'in_progress_by_user_id', in_progress_by_user_id, ''),
  in_progress_by_name = coalesce(payload ->> 'inProgressByName', payload ->> 'in_progress_by_name', in_progress_by_name, ''),
  in_progress_by_role = coalesce(payload ->> 'inProgressByRole', payload ->> 'in_progress_by_role', in_progress_by_role, ''),
  in_progress_at = coalesce(payload ->> 'inProgressAt', payload ->> 'in_progress_at', in_progress_at, ''),
  live_at = coalesce(payload ->> 'liveAt', live_at, ''),
  live_requested_at = coalesce(payload ->> 'liveRequestedAt', payload ->> 'live_requested_at', live_requested_at, ''),
  live_requested_by_user_id = coalesce(
    payload ->> 'liveRequestedByUserId',
    payload ->> 'live_requested_by_user_id',
    live_requested_by_user_id,
    ''
  ),
  live_requested_by_name = coalesce(
    payload ->> 'liveRequestedByName',
    payload ->> 'live_requested_by_name',
    live_requested_by_name,
    ''
  ),
  live_requested_by_role = coalesce(
    payload ->> 'liveRequestedByRole',
    payload ->> 'live_requested_by_role',
    live_requested_by_role,
    ''
  ),
  live_by_name = coalesce(payload ->> 'liveByName', live_by_name, ''),
  live_by_role = coalesce(payload ->> 'liveByRole', live_by_role, ''),
  live_by_user_id = coalesce(payload ->> 'liveByUserId', live_by_user_id, ''),
  provision_user_id = coalesce(payload ->> 'provisionUserId', payload ->> 'provision_user_id', provision_user_id, ''),
  provision_user_name = coalesce(payload ->> 'provisionUserName', payload ->> 'provision_user_name', provision_user_name, ''),
  provision_user_role = coalesce(payload ->> 'provisionUserRole', payload ->> 'provision_user_role', provision_user_role, ''),
  provision_assigned_at = coalesce(
    payload ->> 'provisionAssignedAt',
    payload ->> 'provision_assigned_at',
    provision_assigned_at,
    ''
  ),
  current_provision_credit_entry_id = coalesce(
    payload ->> 'currentProvisionCreditEntryId',
    payload ->> 'current_provision_credit_entry_id',
    current_provision_credit_entry_id,
    ''
  ),
  current_provision_booked_at = coalesce(
    payload ->> 'currentProvisionBookedAt',
    payload ->> 'current_provision_booked_at',
    current_provision_booked_at,
    ''
  ),
  current_provision_amount_eur = case
    when replace(
      coalesce(payload ->> 'currentProvisionAmountEur', payload ->> 'current_provision_amount_eur', ''),
      ',',
      '.'
    ) ~ '^-?[0-9]+(\.[0-9]+)?$'
      then replace(
        coalesce(payload ->> 'currentProvisionAmountEur', payload ->> 'current_provision_amount_eur', ''),
        ',',
        '.'
      )::numeric(12,2)
    else 0
  end,
  source_partner_request_id = coalesce(
    payload ->> 'sourcePartnerRequestId',
    payload ->> 'source_partner_request_id',
    source_partner_request_id,
    ''
  ),
  source_partner_request_persisted_id = coalesce(
    payload ->> 'sourcePartnerRequestPersistedId',
    payload ->> 'source_partner_request_persisted_id',
    source_partner_request_persisted_id,
    ''
  ),
  source_partner_request_notification_id = coalesce(
    payload ->> 'sourcePartnerRequestNotificationId',
    payload ->> 'source_partner_request_notification_id',
    source_partner_request_notification_id,
    ''
  ),
  linked_partner_request_ids = case
    when jsonb_typeof(payload -> 'linkedPartnerRequestIds') = 'array' then payload -> 'linkedPartnerRequestIds'
    when jsonb_typeof(payload -> 'linked_partner_request_ids') = 'array' then payload -> 'linked_partner_request_ids'
    else '[]'::jsonb
  end,
  linked_partner_request_persisted_ids = case
    when jsonb_typeof(payload -> 'linkedPartnerRequestPersistedIds') = 'array' then payload -> 'linkedPartnerRequestPersistedIds'
    when jsonb_typeof(payload -> 'linked_partner_request_persisted_ids') = 'array' then payload -> 'linked_partner_request_persisted_ids'
    else '[]'::jsonb
  end,
  linked_partner_request_notification_ids = case
    when jsonb_typeof(payload -> 'linkedPartnerRequestNotificationIds') = 'array' then payload -> 'linkedPartnerRequestNotificationIds'
    when jsonb_typeof(payload -> 'linked_partner_request_notification_ids') = 'array' then payload -> 'linked_partner_request_notification_ids'
    else '[]'::jsonb
  end
where payload is not null
  and jsonb_typeof(payload) = 'object';
