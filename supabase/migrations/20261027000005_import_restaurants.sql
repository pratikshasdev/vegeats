-- Bulk upsert used by the import-restaurants Edge Function (service role only).
-- Matches existing rows by google_place_id or yelp_id. Refreshes listing facts
-- (hours, rating, photo, contact) but never downgrades curated diet_level/tags.
create or replace function public.import_restaurants(p_rows jsonb)
returns table (inserted int, updated int)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r jsonb;
  existing_id uuid;
  ins int := 0;
  upd int := 0;
  rank_new int;
  rank_old int;
begin
  for r in select * from jsonb_array_elements(p_rows)
  loop
    select id into existing_id
    from public.restaurants
    where (r->>'google_place_id' is not null and google_place_id = r->>'google_place_id')
       or (r->>'yelp_id' is not null and yelp_id = r->>'yelp_id')
    limit 1;

    if existing_id is null then
      insert into public.restaurants (
        name, description, diet_level, tags, cuisines, price_level,
        address_line, city, region, postal_code, location, phone, website, hours,
        cover_photo_url, google_place_id, yelp_id, external_rating, external_rating_count,
        is_permanently_closed, status
      ) values (
        r->>'name', r->>'description', (r->>'diet_level')::public.diet_level,
        coalesce(array(select jsonb_array_elements_text(r->'tags')), '{}'),
        coalesce(array(select jsonb_array_elements_text(r->'cuisines')), '{}'),
        (r->>'price_level')::smallint,
        r->>'address_line', r->>'city', coalesce(r->>'region', 'MI'), r->>'postal_code',
        extensions.st_setsrid(extensions.st_makepoint((r->>'lng')::float8, (r->>'lat')::float8), 4326)::extensions.geography,
        r->>'phone', r->>'website', case when jsonb_typeof(r->'hours') = 'object' then r->'hours' end,
        r->>'cover_photo_url', r->>'google_place_id', r->>'yelp_id',
        (r->>'external_rating')::numeric, (r->>'external_rating_count')::int,
        coalesce((r->>'is_permanently_closed')::boolean, false), 'approved'
      );
      ins := ins + 1;
    else
      select case diet_level when 'fully_vegan' then 2 when 'vegetarian' then 1 else 0 end
        into rank_old from public.restaurants where id = existing_id;
      rank_new := case r->>'diet_level' when 'fully_vegan' then 2 when 'vegetarian' then 1 else 0 end;

      update public.restaurants set
        diet_level = case when rank_new > rank_old then (r->>'diet_level')::public.diet_level else diet_level end,
        tags = (select coalesce(array_agg(distinct t order by t), '{}')
                from unnest(tags || coalesce(array(select jsonb_array_elements_text(r->'tags')), '{}')) t),
        cuisines = case when cardinality(cuisines) = 0
                        then coalesce(array(select jsonb_array_elements_text(r->'cuisines')), '{}') else cuisines end,
        description = coalesce(description, r->>'description'),
        price_level = coalesce((r->>'price_level')::smallint, price_level),
        phone = coalesce(r->>'phone', phone),
        website = coalesce(r->>'website', website),
        hours = coalesce(case when jsonb_typeof(r->'hours') = 'object' then r->'hours' end, hours),
        cover_photo_url = coalesce(r->>'cover_photo_url', cover_photo_url),
        google_place_id = coalesce(google_place_id, r->>'google_place_id'),
        yelp_id = coalesce(yelp_id, r->>'yelp_id'),
        external_rating = coalesce((r->>'external_rating')::numeric, external_rating),
        external_rating_count = coalesce((r->>'external_rating_count')::int, external_rating_count),
        is_permanently_closed = coalesce((r->>'is_permanently_closed')::boolean, is_permanently_closed)
      where id = existing_id;
      upd := upd + 1;
    end if;
  end loop;
  return query select ins, upd;
end;
$$;

revoke all on function public.import_restaurants(jsonb) from public, anon, authenticated;
grant execute on function public.import_restaurants(jsonb) to service_role;
