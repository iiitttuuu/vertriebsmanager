-- Ansprechpartner-Felder fuer Anbieter in provider_registry ergaenzen.
-- Bestehende Anbieter-Daten bleiben im app_state.payload erhalten; diese Spalten
-- dienen als relationale Erweiterung fuer Supabase und kuenftige Auswertungen.

alter table if exists public.provider_registry
  add column if not exists contact_salutation text not null default '',
  add column if not exists contact_title text not null default '',
  add column if not exists contact_first_name text not null default '',
  add column if not exists contact_last_name text not null default '',
  add column if not exists contact_person text not null default '',
  add column if not exists contact_person_phone text not null default '',
  add column if not exists contact_person_email text not null default '',
  add column if not exists partner_request_redemption_method text not null default '',
  add column if not exists partner_request_message text not null default '';
