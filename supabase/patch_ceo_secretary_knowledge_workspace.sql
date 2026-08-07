-- -------------------------------------------------------------
-- CEO Office / Ideenboard und Wissensbibliothek
-- Persistiert ausschließlich den persönlichen Arbeitsstatus. Die
-- bestehende Owner-RLS bleibt unverändert und greift weiter.
-- Voraussetzung: patch_ceo_secretary.sql wurde bereits ausgeführt.
-- -------------------------------------------------------------

alter table public.ceo_secretary_entries
  add column if not exists workspace_status text;

alter table public.ceo_secretary_entries
  drop constraint if exists ceo_secretary_entries_workspace_status_check;
alter table public.ceo_secretary_entries
  add constraint ceo_secretary_entries_workspace_status_check
  check (workspace_status is null or workspace_status in ('inbox', 'exploring', 'planned', 'trusted', 'review', 'archived'));

-- Statusänderungen sind Teil des vorhandenen, append-only CEO-Audits.
create or replace function public.ceo_secretary_entry_audit_snapshot(entry_row public.ceo_secretary_entries)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'title', coalesce(entry_row.title, ''),
    'entry_type', coalesce(entry_row.entry_type, ''),
    'context_label', coalesce(entry_row.context_label, ''),
    'tags', coalesce(to_jsonb(entry_row.tags), '[]'::jsonb),
    'workspace_status', entry_row.workspace_status,
    'due_date', entry_row.due_date,
    'priority', coalesce(entry_row.priority, 'normal'),
    'is_completed', coalesce(entry_row.is_completed, false),
    'body_length', char_length(coalesce(entry_row.body, ''))
  );
$$;

-- -------------------------------------------------------------
-- END FILE: supabase/patch_ceo_secretary_knowledge_workspace.sql
-- -------------------------------------------------------------
