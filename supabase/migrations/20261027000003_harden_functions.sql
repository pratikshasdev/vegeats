-- Move internal helper functions out of the exposed API schema and lock down trigger functions.

create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

-- Policies reference these by OID, so moving schemas keeps them working.
alter function public.is_admin() set schema private;
alter function public.is_privileged() set schema private;

create or replace function private.is_privileged()
returns boolean language sql stable security definer set search_path = ''
as $$
  select private.is_admin()
      or coalesce((select auth.role()), '') = 'service_role'
      or session_user in ('postgres', 'supabase_admin');
$$;

revoke all on function private.is_admin() from public;
revoke all on function private.is_privileged() from public;
grant execute on function private.is_admin() to anon, authenticated, service_role;
grant execute on function private.is_privileged() to anon, authenticated, service_role;

-- Trigger bodies referenced public.is_privileged() by name; repoint them.
create or replace function public.guard_moderation_columns()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if private.is_privileged() then return new; end if;
  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.created_by := (select auth.uid());
  else
    new.status := old.status;
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

create or replace function public.guard_photo_columns()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if not private.is_privileged() then
    new.status := 'pending';
    new.user_id := (select auth.uid());
  end if;
  return new;
end;
$$;

create or replace function public.guard_profile_role()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if not private.is_privileged() then new.role := old.role; end if;
  return new;
end;
$$;

-- Trigger-only functions should never be callable over REST.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.refresh_restaurant_rating() from public, anon, authenticated;
revoke all on function public.guard_moderation_columns() from public, anon, authenticated;
revoke all on function public.guard_photo_columns() from public, anon, authenticated;
revoke all on function public.guard_profile_role() from public, anon, authenticated;
revoke all on function public.validate_tags() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- One permissive SELECT policy on tags; admin writes split by action.
drop policy "tags managed by admins" on public.tags;
create policy "admins insert tags" on public.tags
  for insert to authenticated with check ((select private.is_admin()));
create policy "admins update tags" on public.tags
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins delete tags" on public.tags
  for delete to authenticated using ((select private.is_admin()));
