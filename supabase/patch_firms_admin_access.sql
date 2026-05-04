-- Firmen-Seite für Admin + Superadmin:
-- - Firmen (conversation_organizations) lesen/anlegen/bearbeiten
-- - Verknüpfte Gesprächsdaten nur lesen (threads/notes/tasks)
-- Gesprächs-CRUD bleibt Superadmin.

-- Threads lesen (Admin + Superadmin)
drop policy if exists "conversation_threads_admin_select" on public.conversation_threads;
create policy "conversation_threads_admin_select"
on public.conversation_threads
for select
to authenticated
using (public.is_admin());

-- Notizen lesen (Admin + Superadmin)
drop policy if exists "conversation_notes_admin_select" on public.conversation_notes;
create policy "conversation_notes_admin_select"
on public.conversation_notes
for select
to authenticated
using (public.is_admin());

-- Aufgaben lesen (Admin + Superadmin zusätzlich zum Assignee-Read)
drop policy if exists "conversation_tasks_admin_select" on public.conversation_tasks;
create policy "conversation_tasks_admin_select"
on public.conversation_tasks
for select
to authenticated
using (public.is_admin());

-- Firmen lesen
drop policy if exists "conversation_organizations_admin_select" on public.conversation_organizations;
create policy "conversation_organizations_admin_select"
on public.conversation_organizations
for select
to authenticated
using (public.is_admin());

-- Firmen anlegen
drop policy if exists "conversation_organizations_admin_insert" on public.conversation_organizations;
create policy "conversation_organizations_admin_insert"
on public.conversation_organizations
for insert
to authenticated
with check (public.is_admin());

-- Firmen bearbeiten
drop policy if exists "conversation_organizations_admin_update" on public.conversation_organizations;
create policy "conversation_organizations_admin_update"
on public.conversation_organizations
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
