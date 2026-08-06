-- Verknuepfung: Eingangsangebot -> daraus erzeugte Eingangsrechnung
-- Das Angebot selbst verbleibt im lokalen Finanzzustand; die Rechnung speichert
-- ausschliesslich die fachliche Herkunft. Es werden keine Berechtigungen erweitert.

alter table public.incoming_invoices
  add column if not exists source_offer_id text not null default '',
  add column if not exists source_offer_number text not null default '',
  add column if not exists source_offer_price_tier_id text not null default '';

create index if not exists idx_incoming_invoices_source_offer_id
  on public.incoming_invoices (source_offer_id)
  where source_offer_id <> '';
