-- Lets the database trigger the import (and, later, pg_cron) without exposing a service key.
-- Usage:  select public.trigger_import('{"cities":["Ann Arbor"],"dryRun":true}');
--         select status_code, content from net._http_response order by id desc limit 1;
create extension if not exists pg_net with schema extensions;

create table if not exists private.import_trigger (
  id boolean primary key default true check (id),
  token text not null default encode(extensions.gen_random_bytes(32), 'hex')
);
insert into private.import_trigger default values on conflict do nothing;
revoke all on private.import_trigger from public, anon, authenticated;

create or replace function public.verify_import_token(p_token text)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from private.import_trigger t where t.token = p_token) $$;

revoke all on function public.verify_import_token(text) from public, anon, authenticated;
grant execute on function public.verify_import_token(text) to service_role;

create or replace function public.trigger_import(p_body jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare
  req_id bigint;
begin
  select net.http_post(
    url := 'https://vvufwgsulrdkpmrcmjtv.supabase.co/functions/v1/import-restaurants',
    body := p_body,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-import-token', (select token from private.import_trigger),
      'Authorization', 'Bearer sb_publishable_-RujJWH7vlb5juO-XgNlFw_cJKQRuPX',
      'apikey', 'sb_publishable_-RujJWH7vlb5juO-XgNlFw_cJKQRuPX'
    ),
    timeout_milliseconds := 300000
  ) into req_id;
  return req_id;
end;
$$;

revoke all on function public.trigger_import(jsonb) from public, anon, authenticated;
