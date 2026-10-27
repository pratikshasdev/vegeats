-- session_user stays 'postgres' after SET ROLE, so check the active role instead.
-- security invoker: current_user is the caller's role (anon / authenticated / service_role / postgres).
create or replace function private.is_privileged()
returns boolean language sql stable security invoker set search_path = ''
as $$
  select current_user in ('postgres', 'supabase_admin', 'service_role')
      or coalesce((select auth.role()), '') = 'service_role'
      or private.is_admin();
$$;
