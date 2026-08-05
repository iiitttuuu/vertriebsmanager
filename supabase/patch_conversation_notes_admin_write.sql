-- Gesprächsnotizen: Schreibrechte für Admin und Superadmin vereinheitlichen.
-- Die Oberfläche erlaubt beiden Rollen das Anlegen und Bearbeiten von Gesprächen.
-- Im Supabase SQL Editor ausführen. Idempotent.

drop policy if exists "conversation_threads_superadmin_select" on public.conversation_threads;
drop policy if exists "conversation_threads_superadmin_insert" on public.conversation_threads;
drop policy if exists "conversation_threads_superadmin_update" on public.conversation_threads;
drop policy if exists "conversation_threads_superadmin_delete" on public.conversation_threads;
drop policy if exists "conversation_threads_admin_select" on public.conversation_threads;
drop policy if exists "conversation_threads_admin_insert" on public.conversation_threads;
drop policy if exists "conversation_threads_admin_update" on public.conversation_threads;
drop policy if exists "conversation_threads_admin_delete" on public.conversation_threads;

create policy "conversation_threads_admin_select"
on public.conversation_threads for select to authenticated
using (public.is_admin());

create policy "conversation_threads_admin_insert"
on public.conversation_threads for insert to authenticated
with check (public.is_admin());

create policy "conversation_threads_admin_update"
on public.conversation_threads for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "conversation_threads_admin_delete"
on public.conversation_threads for delete to authenticated
using (public.is_admin());

drop policy if exists "conversation_notes_superadmin_select" on public.conversation_notes;
drop policy if exists "conversation_notes_superadmin_insert" on public.conversation_notes;
drop policy if exists "conversation_notes_superadmin_update" on public.conversation_notes;
drop policy if exists "conversation_notes_superadmin_delete" on public.conversation_notes;
drop policy if exists "conversation_notes_admin_select" on public.conversation_notes;
drop policy if exists "conversation_notes_admin_insert" on public.conversation_notes;
drop policy if exists "conversation_notes_admin_update" on public.conversation_notes;
drop policy if exists "conversation_notes_admin_delete" on public.conversation_notes;

create policy "conversation_notes_admin_select"
on public.conversation_notes for select to authenticated
using (public.is_admin());

create policy "conversation_notes_admin_insert"
on public.conversation_notes for insert to authenticated
with check (public.is_admin());

create policy "conversation_notes_admin_update"
on public.conversation_notes for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "conversation_notes_admin_delete"
on public.conversation_notes for delete to authenticated
using (public.is_admin());

drop policy if exists "conversation_tasks_superadmin_or_assignee_select" on public.conversation_tasks;
drop policy if exists "conversation_tasks_superadmin_insert" on public.conversation_tasks;
drop policy if exists "conversation_tasks_superadmin_update" on public.conversation_tasks;
drop policy if exists "conversation_tasks_superadmin_delete" on public.conversation_tasks;
drop policy if exists "conversation_tasks_admin_select" on public.conversation_tasks;
drop policy if exists "conversation_tasks_admin_or_assignee_select" on public.conversation_tasks;
drop policy if exists "conversation_tasks_admin_insert" on public.conversation_tasks;
drop policy if exists "conversation_tasks_admin_update" on public.conversation_tasks;
drop policy if exists "conversation_tasks_admin_delete" on public.conversation_tasks;

create policy "conversation_tasks_admin_or_assignee_select"
on public.conversation_tasks for select to authenticated
using (
  public.is_admin()
  or (
    assignee_user_id::text = auth.uid()::text
    and exists (
      select 1 from public.profiles p
      where p.user_id::text = auth.uid()::text and p.status = 'active'
    )
  )
);

create policy "conversation_tasks_admin_insert"
on public.conversation_tasks for insert to authenticated
with check (public.is_admin());

create policy "conversation_tasks_admin_update"
on public.conversation_tasks for update to authenticated
using (public.is_admin()) with check (public.is_admin());

create policy "conversation_tasks_admin_delete"
on public.conversation_tasks for delete to authenticated
using (public.is_admin());
