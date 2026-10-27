-- VegEats core schema
-- Restaurants, menus (dishes), reviews, community photos, reports, profiles, tags.

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.content_status as enum ('pending', 'approved', 'rejected');
create type public.diet_level as enum ('fully_vegan', 'vegetarian', 'veg_friendly');
create type public.tag_category as enum ('diet', 'allergen', 'health', 'religious');
create type public.photo_kind as enum ('menu', 'dish', 'place');
create type public.report_target as enum ('restaurant', 'dish', 'review', 'photo');
create type public.report_reason as enum (
  'not_vegan', 'not_vegetarian', 'allergen_info_wrong', 'wrong_hours',
  'permanently_closed', 'wrong_location', 'duplicate', 'inappropriate', 'other'
);
create type public.report_status as enum ('open', 'resolved', 'dismissed');
create type public.user_role as enum ('user', 'admin');

-- ---------------------------------------------------------------------------
-- Tags (diet / allergen-free / health / religious-cultural)
-- ---------------------------------------------------------------------------
create table public.tags (
  slug        text primary key check (slug ~ '^[a-z0-9_]+$'),
  label       text not null,
  category    public.tag_category not null,
  description text,
  sort_order  int not null default 0
);

insert into public.tags (slug, label, category, description, sort_order) values
  -- diet
  ('vegan',            'Vegan',               'diet',      'No animal products of any kind', 1),
  ('vegetarian',       'Vegetarian',          'diet',      'No meat, poultry or fish', 2),
  ('lacto_vegetarian', 'Lacto-vegetarian',    'diet',      'Vegetarian with dairy, no eggs', 3),
  ('ovo_vegetarian',   'Ovo-vegetarian',      'diet',      'Vegetarian with eggs, no dairy', 4),
  ('lacto_ovo',        'Lacto-ovo',           'diet',      'Vegetarian with dairy and eggs', 5),
  -- allergen-free
  ('gluten_free',      'Gluten-free',         'allergen',  'No wheat, barley, rye or cross-contact', 10),
  ('nut_free',         'Nut-free',            'allergen',  'No peanuts or tree nuts', 11),
  ('soy_free',         'Soy-free',            'allergen',  'No soy', 12),
  ('dairy_free',       'Dairy-free',          'allergen',  'No milk or milk derivatives', 13),
  -- health-focused
  ('oil_free',         'Oil-free',            'health',    'Prepared without added oil', 20),
  ('wfpb',             'Whole-food plant-based', 'health', 'Minimally processed plant foods', 21),
  ('low_sodium',       'Low-sodium',          'health',    'Reduced salt', 22),
  ('high_protein',     'High-protein',        'health',    'Protein-rich dish', 23),
  ('b12_source',       'B12 source',          'health',    'Fortified or natural B12 source', 24),
  ('iron_rich',        'Iron-rich',           'health',    'Good plant source of iron', 25),
  -- religious / cultural
  ('jain',             'Jain',                'religious', 'No root vegetables, eggs, honey or meat', 30),
  ('sattvic',          'Sattvic (no onion/garlic)', 'religious', 'No onion, garlic or meat', 31),
  ('halal_veg',        'Halal vegetarian',    'religious', 'Vegetarian, halal-compliant ingredients', 32),
  ('kosher_veg',       'Kosher vegetarian',   'religious', 'Vegetarian, kosher-certified', 33);

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text check (char_length(display_name) between 1 and 60),
  avatar_url        text,
  diet_preferences  text[] not null default '{}',
  role              public.user_role not null default 'user',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Admin check used by RLS (security definer so it can read profiles under RLS).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

-- Trusted callers: admins, the service role (Edge Functions) and direct DB sessions (migrations).
create or replace function public.is_privileged()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin()
      or coalesce((select auth.role()), '') = 'service_role'
      or session_user in ('postgres', 'supabase_admin');
$$;

-- Create profile on sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(new.email, '@', 1), ''),
      'VegEats user'
    ), 60),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Generic updated_at trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Restaurants
-- ---------------------------------------------------------------------------
create table public.restaurants (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (char_length(name) between 1 and 120),
  description      text check (char_length(description) <= 2000),
  diet_level       public.diet_level not null default 'veg_friendly',
  tags             text[] not null default '{}',
  cuisines         text[] not null default '{}',
  price_level      smallint check (price_level between 1 and 4),
  address_line     text not null,
  city             text not null,
  region           text not null default 'MI',
  postal_code      text,
  country          text not null default 'US',
  location         extensions.geography(Point, 4326) not null,
  phone            text,
  website          text,
  -- Weekly hours: {"mon":[["11:00","21:00"]], "tue":[], ...} in the restaurant's timezone.
  hours            jsonb,
  timezone         text not null default 'America/Detroit',
  cover_photo_url  text,
  google_place_id  text unique,
  yelp_id          text unique,
  external_rating  numeric(2,1),
  external_rating_count int,
  rating_avg       numeric(3,2) not null default 0,
  rating_count     int not null default 0,
  is_permanently_closed boolean not null default false,
  status           public.content_status not null default 'pending',
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index restaurants_location_idx on public.restaurants using gist (location);
create index restaurants_status_idx on public.restaurants (status);
create index restaurants_tags_idx on public.restaurants using gin (tags);
create index restaurants_name_trgm_idx on public.restaurants using gin (name extensions.gin_trgm_ops);
create index restaurants_created_by_idx on public.restaurants (created_by);

create trigger restaurants_updated_at before update on public.restaurants
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Dishes (menu items)
-- ---------------------------------------------------------------------------
create table public.dishes (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 120),
  description    text check (char_length(description) <= 1000),
  category       text not null default 'Mains' check (char_length(category) between 1 and 60),
  price_cents    int check (price_cents >= 0),
  tags           text[] not null default '{}',
  photo_url      text,
  sort_order     int not null default 0,
  status         public.content_status not null default 'pending',
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index dishes_restaurant_idx on public.dishes (restaurant_id, status);
create index dishes_tags_idx on public.dishes using gin (tags);
create index dishes_created_by_idx on public.dishes (created_by);

create trigger dishes_updated_at before update on public.dishes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  rating         smallint not null check (rating between 1 and 5),
  body           text check (char_length(body) <= 2000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

create index reviews_restaurant_idx on public.reviews (restaurant_id, created_at desc);
create index reviews_user_idx on public.reviews (user_id);

create trigger reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

-- Keep restaurants.rating_avg / rating_count in sync.
create or replace function public.refresh_restaurant_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rid uuid := coalesce(new.restaurant_id, old.restaurant_id);
begin
  update public.restaurants r
  set rating_avg   = coalesce((select round(avg(rv.rating)::numeric, 2) from public.reviews rv where rv.restaurant_id = rid), 0),
      rating_count = (select count(*) from public.reviews rv where rv.restaurant_id = rid)
  where r.id = rid;
  return null;
end;
$$;

create trigger reviews_rating_sync
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_restaurant_rating();

-- ---------------------------------------------------------------------------
-- Photos (menu / dish / place uploads)
-- ---------------------------------------------------------------------------
create table public.photos (
  id             uuid primary key default gen_random_uuid(),
  restaurant_id  uuid not null references public.restaurants (id) on delete cascade,
  dish_id        uuid references public.dishes (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  kind           public.photo_kind not null,
  storage_path   text not null unique,
  caption        text check (char_length(caption) <= 300),
  status         public.content_status not null default 'pending',
  created_at     timestamptz not null default now()
);

create index photos_restaurant_idx on public.photos (restaurant_id, status, created_at desc);
create index photos_dish_idx on public.photos (dish_id);
create index photos_user_idx on public.photos (user_id);

-- ---------------------------------------------------------------------------
-- Reports (flag incorrect info)
-- ---------------------------------------------------------------------------
create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  target_type  public.report_target not null,
  target_id    uuid not null,
  reason       public.report_reason not null,
  details      text check (char_length(details) <= 1000),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  status       public.report_status not null default 'open',
  resolved_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

create index reports_status_idx on public.reports (status, created_at desc);
create index reports_user_idx on public.reports (user_id);
create index reports_resolved_by_idx on public.reports (resolved_by);
create index reports_target_idx on public.reports (target_type, target_id);

-- ---------------------------------------------------------------------------
-- Tag validation (tags must exist in public.tags)
-- ---------------------------------------------------------------------------
create or replace function public.validate_tags()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  bad text;
begin
  select t into bad
  from unnest(new.tags) as t
  where not exists (select 1 from public.tags tg where tg.slug = t)
  limit 1;
  if bad is not null then
    raise exception 'Unknown tag: %', bad using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger restaurants_validate_tags before insert or update of tags on public.restaurants
  for each row execute function public.validate_tags();
create trigger dishes_validate_tags before insert or update of tags on public.dishes
  for each row execute function public.validate_tags();

-- Non-admins can't self-approve or change ownership/moderation columns.
create or replace function public.guard_moderation_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_privileged() then
    return new;
  end if;
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

create trigger restaurants_guard before insert or update on public.restaurants
  for each row execute function public.guard_moderation_columns();
create trigger dishes_guard before insert or update on public.dishes
  for each row execute function public.guard_moderation_columns();

create or replace function public.guard_photo_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_privileged() then
    new.status := 'pending';
    new.user_id := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger photos_guard before insert on public.photos
  for each row execute function public.guard_photo_columns();

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_privileged() then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_profile_role();
