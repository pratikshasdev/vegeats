-- Emails that become admins on sign-up (private schema: not exposed over the API).
-- Add more admins with:  insert into private.admin_emails (email) values ('someone@example.com');
create table if not exists private.admin_emails (
  email text primary key check (email = lower(email))
);
revoke all on private.admin_emails from public, anon, authenticated;

insert into private.admin_emails (email) values ('pratiksha.sdev@gmail.com') on conflict do nothing;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, role)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(new.email, '@', 1), ''),
      'VegEats user'
    ), 60),
    new.raw_user_meta_data ->> 'avatar_url',
    case when exists (select 1 from private.admin_emails a where a.email = lower(new.email))
         then 'admin'::public.user_role else 'user'::public.user_role end
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- In case the account already exists by the time this runs.
update public.profiles p set role = 'admin'
from auth.users u
where u.id = p.id and lower(u.email) in (select email from private.admin_emails);
