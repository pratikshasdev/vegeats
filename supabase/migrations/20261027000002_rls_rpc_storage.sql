-- Row level security, search RPCs and storage for VegEats.

alter table public.tags        enable row level security;
alter table public.profiles    enable row level security;
alter table public.restaurants enable row level security;
alter table public.dishes      enable row level security;
alter table public.reviews     enable row level security;
alter table public.photos      enable row level security;
alter table public.reports     enable row level security;

-- Tags: public read, admin write.
create policy "tags readable by everyone" on public.tags
  for select using (true);
create policy "tags managed by admins" on public.tags
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Profiles: public read (display name/avatar on reviews), owner update.
create policy "profiles readable by everyone" on public.profiles
  for select using (true);
create policy "users update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- Restaurants: approved visible to all; submitters see their own pending; admins see all.
create policy "restaurants readable" on public.restaurants
  for select using (
    status = 'approved'
    or created_by = (select auth.uid())
    or (select public.is_admin())
  );
create policy "signed-in users submit restaurants" on public.restaurants
  for insert to authenticated with check (true);
create policy "admins update restaurants" on public.restaurants
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete restaurants" on public.restaurants
  for delete to authenticated using ((select public.is_admin()));

-- Dishes: same moderation model; dish only visible when its restaurant is visible.
create policy "dishes readable" on public.dishes
  for select using (
    (status = 'approved' and exists (
      select 1 from public.restaurants r where r.id = restaurant_id and r.status = 'approved'))
    or created_by = (select auth.uid())
    or (select public.is_admin())
  );
create policy "signed-in users submit dishes" on public.dishes
  for insert to authenticated with check (
    exists (select 1 from public.restaurants r where r.id = restaurant_id
            and (r.status = 'approved' or r.created_by = (select auth.uid())))
  );
create policy "admins update dishes" on public.dishes
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete dishes" on public.dishes
  for delete to authenticated using ((select public.is_admin()));

-- Reviews: public read; one per user per restaurant; owner edits/deletes.
create policy "reviews readable by everyone" on public.reviews
  for select using (true);
create policy "users write own review" on public.reviews
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.restaurants r where r.id = restaurant_id and r.status = 'approved')
  );
create policy "users update own review" on public.reviews
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "users or admins delete review" on public.reviews
  for delete to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Photos: approved public; owner sees own pending; admins moderate.
create policy "photos readable" on public.photos
  for select using (
    status = 'approved' or user_id = (select auth.uid()) or (select public.is_admin())
  );
create policy "signed-in users upload photos" on public.photos
  for insert to authenticated with check (
    storage_path like (select auth.uid())::text || '/%'
  );
create policy "admins update photos" on public.photos
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "owner or admin delete photos" on public.photos
  for delete to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Reports: reporter and admins only.
create policy "reporters and admins read reports" on public.reports
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "signed-in users file reports" on public.reports
  for insert to authenticated with check (user_id = (select auth.uid()) and status = 'open');
create policy "admins resolve reports" on public.reports
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Computed columns for PostgREST: restaurants.lat / restaurants.lng
-- ---------------------------------------------------------------------------
create or replace function public.lat(r public.restaurants)
returns double precision
language sql
stable
set search_path = ''
as $$ select extensions.st_y(r.location::extensions.geometry) $$;

create or replace function public.lng(r public.restaurants)
returns double precision
language sql
stable
set search_path = ''
as $$ select extensions.st_x(r.location::extensions.geometry) $$;

-- ---------------------------------------------------------------------------
-- Search: nearby or within map bounds, filtered by tags / diet level / text.
-- A restaurant matches p_tags if the restaurant itself has all tags, or it has
-- at least one approved dish carrying all of them.
-- ---------------------------------------------------------------------------
create or replace function public.search_restaurants(
  p_lat          double precision,
  p_lng          double precision,
  p_radius_m     double precision default 40000,
  p_tags         text[] default '{}',
  p_diet_levels  public.diet_level[] default null,
  p_query        text default null,
  p_min_lat      double precision default null,
  p_min_lng      double precision default null,
  p_max_lat      double precision default null,
  p_max_lng      double precision default null,
  p_limit        int default 50,
  p_offset       int default 0
)
returns table (
  id               uuid,
  name             text,
  description      text,
  diet_level       public.diet_level,
  tags             text[],
  cuisines         text[],
  price_level      smallint,
  address_line     text,
  city             text,
  region           text,
  postal_code      text,
  lat              double precision,
  lng              double precision,
  hours            jsonb,
  timezone         text,
  cover_photo_url  text,
  rating_avg       numeric,
  rating_count     int,
  external_rating  numeric,
  external_rating_count int,
  distance_m       double precision
)
language sql
stable
set search_path = ''
as $$
  with origin as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as g
  )
  select
    r.id, r.name, r.description, r.diet_level, r.tags, r.cuisines, r.price_level,
    r.address_line, r.city, r.region, r.postal_code,
    extensions.st_y(r.location::extensions.geometry) as lat,
    extensions.st_x(r.location::extensions.geometry) as lng,
    r.hours, r.timezone, r.cover_photo_url,
    r.rating_avg, r.rating_count, r.external_rating, r.external_rating_count,
    extensions.st_distance(r.location, o.g) as distance_m
  from public.restaurants r, origin o
  where r.status = 'approved'
    and not r.is_permanently_closed
    and (
      case
        when p_min_lat is not null and p_min_lng is not null and p_max_lat is not null and p_max_lng is not null
          then extensions.st_intersects(
                 r.location,
                 extensions.st_makeenvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)::extensions.geography)
        else extensions.st_dwithin(r.location, o.g, least(greatest(p_radius_m, 100), 200000))
      end
    )
    and (p_diet_levels is null or r.diet_level = any (p_diet_levels))
    and (
      coalesce(cardinality(p_tags), 0) = 0
      or r.tags @> p_tags
      or exists (
        select 1 from public.dishes d
        where d.restaurant_id = r.id and d.status = 'approved' and d.tags @> p_tags
      )
    )
    and (
      p_query is null or btrim(p_query) = ''
      or r.name ilike '%' || btrim(p_query) || '%'
      or exists (select 1 from unnest(r.cuisines) c where c ilike '%' || btrim(p_query) || '%')
      or exists (
        select 1 from public.dishes d
        where d.restaurant_id = r.id and d.status = 'approved'
          and d.name ilike '%' || btrim(p_query) || '%'
      )
    )
  order by distance_m asc
  limit least(greatest(p_limit, 1), 200)
  offset greatest(p_offset, 0);
$$;

grant execute on function public.search_restaurants to anon, authenticated;

-- Submit a restaurant with a lat/lng (clients can't build geography values over REST).
create or replace function public.submit_restaurant(
  p_name         text,
  p_address_line text,
  p_city         text,
  p_region       text,
  p_postal_code  text,
  p_lat          double precision,
  p_lng          double precision,
  p_diet_level   public.diet_level,
  p_tags         text[] default '{}',
  p_cuisines     text[] default '{}',
  p_description  text default null,
  p_phone        text default null,
  p_website      text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to submit a restaurant' using errcode = '42501';
  end if;
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Invalid coordinates' using errcode = '22023';
  end if;
  insert into public.restaurants (
    name, address_line, city, region, postal_code, location, diet_level,
    tags, cuisines, description, phone, website
  ) values (
    btrim(p_name), btrim(p_address_line), btrim(p_city), coalesce(nullif(btrim(p_region), ''), 'MI'),
    nullif(btrim(p_postal_code), ''),
    extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography,
    p_diet_level, coalesce(p_tags, '{}'), coalesce(p_cuisines, '{}'),
    nullif(btrim(p_description), ''), nullif(btrim(p_phone), ''), nullif(btrim(p_website), '')
  )
  returning id into new_id;
  return new_id;
end;
$$;

revoke execute on function public.submit_restaurant from anon, public;
grant execute on function public.submit_restaurant to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: community photos bucket. Paths: <user_id>/<restaurant_id>/<uuid>.jpg
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create policy "users upload to own photo folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users delete own photo files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
