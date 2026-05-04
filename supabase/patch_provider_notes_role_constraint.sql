-- Fix fuer provider_notes.created_by_role Check-Constraint
-- Fehlerbild: Code 23514 / provider_notes_created_by_role_check
-- Im Supabase SQL Editor ausfuehren.

-- 1) Legacy-/Tippfehler-Werte normalisieren
update public.provider_notes
set created_by_role = 'superadmin'
where lower(coalesce(created_by_role, '')) = 'supaadmin';

update public.provider_notes
set created_by_role = 'mitarbeiter'
where lower(coalesce(created_by_role, '')) not in ('mitarbeiter', 'vertriebsmitarbeiter', 'admin', 'superadmin');

-- 2) Constraint neu setzen (Superadmin erlauben)
alter table public.provider_notes
  drop constraint if exists provider_notes_created_by_role_check;

alter table public.provider_notes
  add constraint provider_notes_created_by_role_check
  check (created_by_role in ('mitarbeiter', 'vertriebsmitarbeiter', 'admin', 'superadmin'));
