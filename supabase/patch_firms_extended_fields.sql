-- Erweiterte Firmenfelder:
-- - Adresse: street, postal_code, city, country
-- - Mehrere Ansprechpartner: contacts_json (jsonb)
-- Idempotent.

alter table public.conversation_organizations
  add column if not exists street text not null default '',
  add column if not exists postal_code text not null default '',
  add column if not exists city text not null default '',
  add column if not exists country text not null default '',
  add column if not exists contacts_json jsonb not null default '[]'::jsonb;
