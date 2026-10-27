// Pure helpers for turning Google Places / Yelp results into VegEats restaurant rows.
// Kept free of network and Deno APIs so they can be unit tested.

export type DayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
export type WeeklyHours = Record<DayKey, [string, string][]>;
export type DietLevel = "fully_vegan" | "vegetarian" | "veg_friendly";

export const DAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export interface GooglePlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  addressComponents?: { longText: string; shortText: string; types: string[] }[];
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  regularOpeningHours?: {
    periods?: {
      open: { day: number; hour: number; minute: number };
      close?: { day: number; hour: number; minute: number };
    }[];
  };
  nationalPhoneNumber?: string;
  websiteUri?: string;
  photos?: { name: string }[];
  businessStatus?: string;
  types?: string[];
  primaryTypeDisplayName?: { text: string };
  editorialSummary?: { text: string };
  servesVegetarianFood?: boolean;
}

export interface YelpBusiness {
  id: string;
  name: string;
  image_url?: string;
  is_closed?: boolean;
  rating?: number;
  review_count?: number;
  price?: string;
  display_phone?: string;
  url?: string;
  categories?: { alias: string; title: string }[];
  coordinates?: { latitude: number | null; longitude: number | null };
  location?: { address1?: string | null; city?: string; state?: string; zip_code?: string };
}

export interface RestaurantRow {
  name: string;
  description: string | null;
  diet_level: DietLevel;
  tags: string[];
  cuisines: string[];
  price_level: number | null;
  address_line: string;
  city: string;
  region: string;
  postal_code: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  website: string | null;
  hours: WeeklyHours | null;
  cover_photo_url: string | null;
  google_place_id: string | null;
  yelp_id: string | null;
  external_rating: number | null;
  external_rating_count: number | null;
  is_permanently_closed: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Google `regularOpeningHours.periods` → {"mon":[["11:00","21:00"]], ...}. Overnight spans keep close < open. */
export function googleHoursToWeekly(
  periods: NonNullable<GooglePlace["regularOpeningHours"]>["periods"],
): WeeklyHours | null {
  if (!periods || periods.length === 0) return null;
  const weekly = Object.fromEntries(DAY_KEYS.map((d) => [d, []])) as unknown as WeeklyHours;
  // A single period with no close means open 24/7.
  if (periods.length === 1 && !periods[0].close) {
    for (const d of DAY_KEYS) weekly[d].push(["00:00", "24:00"]);
    return weekly;
  }
  for (const p of periods) {
    const day = DAY_KEYS[p.open.day];
    if (!day) continue;
    const open = `${pad(p.open.hour)}:${pad(p.open.minute)}`;
    const close = p.close ? `${pad(p.close.hour)}:${pad(p.close.minute)}` : "24:00";
    weekly[day].push([open, close === "00:00" ? "24:00" : close]);
  }
  for (const d of DAY_KEYS) weekly[d].sort((a, b) => a[0].localeCompare(b[0]));
  return weekly;
}

const GOOGLE_PRICE: Record<string, number> = {
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

export function yelpPriceToLevel(price?: string): number | null {
  if (!price) return null;
  const n = price.trim().length;
  return n >= 1 && n <= 4 ? n : null;
}

const VEGAN_NAME = /\b(vegan|plant[- ]?based|plant\s+kitchen)\b/i;
const VEG_NAME = /\b(vegetarian|veggie|veg)\b/i;

/** Conservative: only claim fully vegan / vegetarian when the name or categories say so. */
export function inferDietLevel(name: string, yelpAliases: string[]): DietLevel {
  if (VEGAN_NAME.test(name)) return "fully_vegan";
  if (VEG_NAME.test(name)) return "vegetarian";
  if (yelpAliases.includes("vegan") && yelpAliases.includes("vegetarian")) return "vegetarian";
  return "veg_friendly";
}

export function inferTags(dietLevel: DietLevel, yelpAliases: string[]): string[] {
  const tags = new Set<string>();
  if (dietLevel === "fully_vegan") {
    tags.add("vegan");
    tags.add("vegetarian");
    tags.add("dairy_free");
  }
  if (dietLevel === "vegetarian") tags.add("vegetarian");
  if (yelpAliases.includes("vegan")) tags.add("vegan");
  if (yelpAliases.includes("vegetarian")) tags.add("vegetarian");
  if (yelpAliases.includes("gluten_free")) tags.add("gluten_free");
  if (yelpAliases.includes("raw_food")) tags.add("wfpb");
  return [...tags].sort();
}

const NON_CUISINE = new Set(["vegan", "vegetarian", "gluten_free", "restaurants", "food"]);

export function yelpCuisines(categories: YelpBusiness["categories"] = []): string[] {
  return categories.filter((c) => !NON_CUISINE.has(c.alias)).map((c) => c.title).slice(0, 4);
}

function component(place: GooglePlace, type: string, short = false): string | null {
  const c = place.addressComponents?.find((a) => a.types.includes(type));
  return c ? (short ? c.shortText : c.longText) : null;
}

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/\b(the|restaurant|cafe|kitchen|llc|inc)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Haversine distance in meters. */
export function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function isSamePlace(
  a: { name: string; lat: number; lng: number },
  b: { name: string; lat: number; lng: number },
): boolean {
  const close = distanceMeters(a.lat, a.lng, b.lat, b.lng) < 150;
  if (!close) return false;
  const na = normalizeName(a.name);
  const nb = normalizeName(b.name);
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function fromGoogle(place: GooglePlace, photoUrl: string | null): RestaurantRow | null {
  if (!place.location || !place.displayName?.text) return null;
  const streetNumber = component(place, "street_number");
  const route = component(place, "route");
  const city = component(place, "locality") ?? component(place, "postal_town") ??
    component(place, "sublocality") ?? "";
  const addressLine = [streetNumber, route].filter(Boolean).join(" ") ||
    place.formattedAddress?.split(",")[0] || "";
  if (!addressLine || !city) return null;
  const name = place.displayName.text;
  const diet = inferDietLevel(name, []);
  return {
    name,
    description: place.editorialSummary?.text ?? null,
    diet_level: diet,
    tags: inferTags(diet, []),
    cuisines: place.primaryTypeDisplayName?.text && !/restaurant/i.test(place.primaryTypeDisplayName.text)
      ? [place.primaryTypeDisplayName.text.replace(/ Restaurant$/i, "")]
      : [],
    price_level: place.priceLevel ? GOOGLE_PRICE[place.priceLevel] ?? null : null,
    address_line: addressLine,
    city,
    region: component(place, "administrative_area_level_1", true) ?? "MI",
    postal_code: component(place, "postal_code"),
    lat: place.location.latitude,
    lng: place.location.longitude,
    phone: place.nationalPhoneNumber ?? null,
    website: place.websiteUri ?? null,
    hours: googleHoursToWeekly(place.regularOpeningHours?.periods),
    cover_photo_url: photoUrl,
    google_place_id: place.id,
    yelp_id: null,
    external_rating: place.rating ?? null,
    external_rating_count: place.userRatingCount ?? null,
    is_permanently_closed: place.businessStatus === "CLOSED_PERMANENTLY",
  };
}

export function fromYelp(b: YelpBusiness): RestaurantRow | null {
  const lat = b.coordinates?.latitude;
  const lng = b.coordinates?.longitude;
  if (lat == null || lng == null || !b.location?.address1 || !b.location.city) return null;
  const aliases = (b.categories ?? []).map((c) => c.alias);
  const diet = inferDietLevel(b.name, aliases);
  return {
    name: b.name,
    description: null,
    diet_level: diet,
    tags: inferTags(diet, aliases),
    cuisines: yelpCuisines(b.categories),
    price_level: yelpPriceToLevel(b.price),
    address_line: b.location.address1,
    city: b.location.city,
    region: b.location.state ?? "MI",
    postal_code: b.location.zip_code ?? null,
    lat,
    lng,
    phone: b.display_phone || null,
    website: null,
    hours: null,
    cover_photo_url: b.image_url || null,
    google_place_id: null,
    yelp_id: b.id,
    external_rating: b.rating ?? null,
    external_rating_count: b.review_count ?? null,
    is_permanently_closed: !!b.is_closed,
  };
}

/** Merge a Yelp row into a Google row: Google wins for address/hours, Yelp adds categories/tags. */
export function mergeRows(google: RestaurantRow, yelp: RestaurantRow): RestaurantRow {
  const tags = [...new Set([...google.tags, ...yelp.tags])].sort();
  const dietRank: Record<DietLevel, number> = { veg_friendly: 0, vegetarian: 1, fully_vegan: 2 };
  return {
    ...google,
    diet_level: dietRank[yelp.diet_level] > dietRank[google.diet_level] ? yelp.diet_level : google.diet_level,
    tags,
    cuisines: google.cuisines.length ? google.cuisines : yelp.cuisines,
    price_level: google.price_level ?? yelp.price_level,
    phone: google.phone ?? yelp.phone,
    cover_photo_url: google.cover_photo_url ?? yelp.cover_photo_url,
    yelp_id: yelp.yelp_id,
    is_permanently_closed: google.is_permanently_closed || yelp.is_permanently_closed,
  };
}

/** Combine both sources, de-duplicating places that appear in both. */
export function mergeSources(googleRows: RestaurantRow[], yelpRows: RestaurantRow[]): RestaurantRow[] {
  const out: RestaurantRow[] = [];
  const pushUnique = (row: RestaurantRow) => {
    const idx = out.findIndex((r) =>
      (row.google_place_id && r.google_place_id === row.google_place_id) ||
      (row.yelp_id && r.yelp_id === row.yelp_id)
    );
    if (idx === -1) out.push(row);
  };
  googleRows.forEach(pushUnique);
  for (const y of yelpRows) {
    if (out.some((r) => r.yelp_id === y.yelp_id)) continue;
    const idx = out.findIndex((r) => !r.yelp_id && isSamePlace(r, y));
    if (idx >= 0) out[idx] = mergeRows(out[idx], y);
    else out.push(y);
  }
  return out;
}
