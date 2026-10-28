-- Import fix: a place can exist twice (once from Yelp, once from Google) before the two are
-- linked. Prefer the Google match, and never copy an external id that another row already owns,
-- so one overlapping place can no longer abort a whole city's import.
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
    existing_id := null;
    if r->>'google_place_id' is not null then
      select id into existing_id from public.restaurants where google_place_id = r->>'google_place_id';
    end if;
    if existing_id is null and r->>'yelp_id' is not null then
      select id into existing_id from public.restaurants where yelp_id = r->>'yelp_id';
    end if;

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

      update public.restaurants t set
        diet_level = case when rank_new > rank_old then (r->>'diet_level')::public.diet_level else t.diet_level end,
        tags = (select coalesce(array_agg(distinct x order by x), '{}')
                from unnest(t.tags || coalesce(array(select jsonb_array_elements_text(r->'tags')), '{}')) x),
        cuisines = case when cardinality(t.cuisines) = 0
                        then coalesce(array(select jsonb_array_elements_text(r->'cuisines')), '{}') else t.cuisines end,
        description = coalesce(t.description, r->>'description'),
        price_level = coalesce((r->>'price_level')::smallint, t.price_level),
        phone = coalesce(r->>'phone', t.phone),
        website = coalesce(r->>'website', t.website),
        hours = coalesce(case when jsonb_typeof(r->'hours') = 'object' then r->'hours' end, t.hours),
        cover_photo_url = coalesce(r->>'cover_photo_url', t.cover_photo_url),
        google_place_id = coalesce(t.google_place_id, case when not exists (
          select 1 from public.restaurants o where o.google_place_id = r->>'google_place_id'
        ) then r->>'google_place_id' end),
        yelp_id = coalesce(t.yelp_id, case when not exists (
          select 1 from public.restaurants o where o.yelp_id = r->>'yelp_id'
        ) then r->>'yelp_id' end),
        external_rating = coalesce((r->>'external_rating')::numeric, t.external_rating),
        external_rating_count = coalesce((r->>'external_rating_count')::int, t.external_rating_count),
        is_permanently_closed = coalesce((r->>'is_permanently_closed')::boolean, t.is_permanently_closed)
      where t.id = existing_id;
      upd := upd + 1;
    end if;
  end loop;
  return query select ins, upd;
end;
$$;

revoke all on function public.import_restaurants(jsonb) from public, anon, authenticated;
grant execute on function public.import_restaurants(jsonb) to service_role;
