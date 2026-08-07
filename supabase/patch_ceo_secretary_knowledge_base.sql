-- -------------------------------------------------------------
-- CEO Office / Wissensbasis
-- Erweitert das private Sekretär-Gedächtnis um Ideen, dauerhaftes
-- Wissen und durchsuchbare Schlagwörter. Idempotent ausführen.
-- Voraussetzung: patch_ceo_secretary.sql wurde bereits ausgeführt.
-- -------------------------------------------------------------

alter table public.ceo_secretary_entries
  add column if not exists tags text[] not null default '{}';

alter table public.ceo_secretary_entries
  drop constraint if exists ceo_secretary_entries_entry_type_check;
alter table public.ceo_secretary_entries
  add constraint ceo_secretary_entries_entry_type_check
  check (entry_type in ('note', 'task', 'followup', 'decision', 'idea', 'knowledge'));

create index if not exists idx_ceo_secretary_entries_tags
  on public.ceo_secretary_entries using gin (tags);

-- Die bestehende Row-Level-Security bleibt unverändert: Jeder Eintrag,
-- inklusive seiner Schlagwörter, ist nur für den eigenen Superadmin lesbar.
-- -------------------------------------------------------------
-- END FILE: supabase/patch_ceo_secretary_knowledge_base.sql
-- -------------------------------------------------------------
