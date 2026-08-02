-- Desktop-CRM: Echtzeit-Synchronisierung für gemeinsamen CRM-Stand und Anbieter.
-- Idempotent: kann im Supabase SQL Editor mehrfach ausgeführt werden.
-- Die vorhandenen RLS-Policies bleiben maßgeblich für die sichtbaren Zeilen.

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_state'
  ) then
    execute 'alter publication supabase_realtime add table public.app_state';
  end if;

  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'providers'
  ) then
    execute 'alter publication supabase_realtime add table public.providers';
  end if;
end;
$$;
