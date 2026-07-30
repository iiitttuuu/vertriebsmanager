-- Ergänzt die relationale Dashboard-Markierung für bestehende Installationen.
-- Die PWA speichert den Wert zusätzlich im payload, damit ältere Daten erhalten bleiben.
alter table if exists public.providers
  add column if not exists dashboard_created boolean not null default false;
