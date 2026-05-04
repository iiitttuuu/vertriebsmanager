-- Fuegt die Rolle "superadmin" hinzu (volle Admin-Rechte).
-- Legacy-Wert "supaadmin" wird auf "superadmin" normalisiert.
-- Im Supabase SQL Editor ausfuehren.

update public.profiles
set role = 'superadmin'
where role = 'supaadmin';

update public.employee_invites
set role = 'superadmin'
where role = 'supaadmin';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'superadmin', 'supaadmin', 'mitarbeiter', 'vertriebsmitarbeiter'));

alter table public.employee_invites drop constraint if exists employee_invites_role_check;
alter table public.employee_invites
  add constraint employee_invites_role_check
  check (role in ('admin', 'superadmin', 'supaadmin', 'mitarbeiter', 'vertriebsmitarbeiter'));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('admin', 'superadmin', 'supaadmin'), false);
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.employee_invites%rowtype;
  normalized_email text;
  fallback_name text;
  has_admin boolean;
  assigned_role text;
begin
  normalized_email := lower(coalesce(new.email, ''));
  fallback_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'name',
    split_part(normalized_email, '@', 1),
    'Benutzer'
  );

  select exists(
    select 1
    from public.profiles p
    where p.role in ('admin', 'superadmin', 'supaadmin')
      and p.status = 'active'
  ) into has_admin;

  select *
  into invite_row
  from public.employee_invites
  where lower(email) = normalized_email
    and status = 'pending'
  order by created_at asc
  limit 1;

  if invite_row.id is not null then
    assigned_role := coalesce(invite_row.role, 'mitarbeiter');
  else
    assigned_role := case when has_admin then 'mitarbeiter' else 'admin' end;
  end if;

  insert into public.profiles (
    user_id, email, full_name, role, phone, address, status
  )
  values (
    new.id,
    normalized_email,
    coalesce(invite_row.full_name, fallback_name),
    assigned_role,
    coalesce(invite_row.phone, ''),
    coalesce(invite_row.address, ''),
    case when assigned_role in ('admin', 'superadmin', 'supaadmin') then 'active' else 'pending' end
  )
  on conflict (user_id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        role = excluded.role,
        phone = excluded.phone,
        address = excluded.address,
        status = case when excluded.role in ('admin', 'superadmin', 'supaadmin') then 'active' else 'pending' end,
        updated_at = now();

  if invite_row.id is not null then
    update public.employee_invites
    set status = 'accepted',
        accepted_by = new.id,
        updated_at = now()
    where id = invite_row.id;
  end if;

  return new;
end;
$$;

-- Beispiel: bestehenden User zum Superadmin machen
-- update public.profiles
-- set role = 'superadmin', status = 'active', updated_at = now()
-- where email = 'deine.mail@beispiel.at';
