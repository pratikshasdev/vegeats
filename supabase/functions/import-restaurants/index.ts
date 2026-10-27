// import-restaurants: pulls vegan / vegetarian listings for Michigan cities from
// Google Places (New) and Yelp Fusion, merges duplicates, and upserts them.
//
// Invoke (admin JWT or service-role key):
//   POST /functions/v1/import-restaurants
//   { "cities": ["Ann Arbor", "Detroit"], "dryRun": false }
// Omit "cities" to import every city in MICHIGAN_CITIES.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  fromGoogle,
  fromYelp,
  type GooglePlace,
  mergeSources,
  type RestaurantRow,
  type YelpBusiness,
} from "../_shared/normalize.ts";

interface City {
  name: string;
  lat: number;
  lng: number;
}

export const MICHIGAN_CITIES: City[] = [
  { name: "Ann Arbor", lat: 42.2808, lng: -83.743 },
  { name: "Ypsilanti", lat: 42.2411, lng: -83.613 },
  { name: "Canton", lat: 42.3087, lng: -83.4822 },
  { name: "Plymouth", lat: 42.3714, lng: -83.4702 },
  { name: "Novi", lat: 42.4806, lng: -83.4755 },
  { name: "Livonia", lat: 42.3684, lng: -83.3527 },
  { name: "Farmington Hills", lat: 42.4989, lng: -83.3677 },
  { name: "Dearborn", lat: 42.3223, lng: -83.1763 },
  { name: "Detroit", lat: 42.3314, lng: -83.0458 },
  { name: "Hamtramck", lat: 42.3928, lng: -83.0496 },
  { name: "Ferndale", lat: 42.4606, lng: -83.1346 },
  { name: "Royal Oak", lat: 42.4895, lng: -83.1446 },
  { name: "Birmingham", lat: 42.5467, lng: -83.2113 },
  { name: "Troy", lat: 42.6064, lng: -83.1498 },
  { name: "Lansing", lat: 42.7325, lng: -84.5555 },
  { name: "East Lansing", lat: 42.737, lng: -84.4839 },
  { name: "Flint", lat: 43.0125, lng: -83.6875 },
  { name: "Grand Rapids", lat: 42.9634, lng: -85.6681 },
  { name: "Kalamazoo", lat: 42.2917, lng: -85.5872 },
  { name: "Traverse City", lat: 44.7631, lng: -85.6206 },
  { name: "Marquette", lat: 46.5436, lng: -87.3954 },
];

const GOOGLE_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.regularOpeningHours.periods",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.photos",
  "places.businessStatus",
  "places.primaryTypeDisplayName",
  "places.editorialSummary",
  "nextPageToken",
].join(",");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function googleSearch(key: string, city: City): Promise<GooglePlace[]> {
  const places: GooglePlace[] = [];
  for (const query of [`vegan restaurant in ${city.name}, Michigan`, `vegetarian restaurant in ${city.name}, Michigan`]) {
    let pageToken: string | undefined;
    for (let page = 0; page < 3; page++) {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": GOOGLE_FIELDS,
        },
        body: JSON.stringify({
          textQuery: query,
          pageSize: 20,
          pageToken,
          locationBias: { circle: { center: { latitude: city.lat, longitude: city.lng }, radius: 25000 } },
        }),
      });
      if (!res.ok) throw new Error(`Google Places ${res.status}: ${await res.text()}`);
      const data = await res.json() as { places?: GooglePlace[]; nextPageToken?: string };
      places.push(...(data.places ?? []));
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
  }
  return places;
}

async function googlePhotoUrl(key: string, place: GooglePlace): Promise<string | null> {
  const name = place.photos?.[0]?.name;
  if (!name) return null;
  const res = await fetch(
    `https://places.googleapis.com/v1/${name}/media?maxWidthPx=1000&skipHttpRedirect=true`,
    { headers: { "X-Goog-Api-Key": key } },
  );
  if (!res.ok) return null;
  const data = await res.json() as { photoUri?: string };
  return data.photoUri ?? null;
}

async function yelpSearch(key: string, city: City): Promise<YelpBusiness[]> {
  const out: YelpBusiness[] = [];
  for (let offset = 0; offset < 100; offset += 50) {
    const params = new URLSearchParams({
      latitude: String(city.lat),
      longitude: String(city.lng),
      radius: "25000",
      categories: "vegan,vegetarian",
      limit: "50",
      offset: String(offset),
      sort_by: "best_match",
    });
    const res = await fetch(`https://api.yelp.com/v3/businesses/search?${params}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Yelp ${res.status}: ${await res.text()}`);
    const data = await res.json() as { businesses?: YelpBusiness[]; total?: number };
    out.push(...(data.businesses ?? []));
    if (!data.businesses?.length || offset + 50 >= (data.total ?? 0)) break;
  }
  return out;
}

const inMichigan = (r: RestaurantRow) => r.region === "MI" || r.region === "Michigan";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Authorize: service-role key, or a signed-in admin.
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (token !== serviceKey) {
    const { data: userData, error } = await admin.auth.getUser(token);
    if (error || !userData.user) return json({ error: "Unauthorized" }, 401);
    const { data: profile } = await admin.from("profiles").select("role").eq("id", userData.user.id).single();
    if (profile?.role !== "admin") return json({ error: "Admins only" }, 403);
  }

  const googleKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
  const yelpKey = Deno.env.get("YELP_API_KEY");
  if (!googleKey && !yelpKey) {
    return json({ error: "Set GOOGLE_PLACES_API_KEY and/or YELP_API_KEY in Edge Function secrets." }, 500);
  }

  let body: { cities?: string[]; dryRun?: boolean } = {};
  try {
    body = await req.json();
  } catch { /* empty body is fine */ }

  const cities = body.cities?.length
    ? MICHIGAN_CITIES.filter((c) => body.cities!.some((n) => n.toLowerCase() === c.name.toLowerCase()))
    : MICHIGAN_CITIES;
  if (cities.length === 0) return json({ error: "No matching cities", known: MICHIGAN_CITIES.map((c) => c.name) }, 400);

  const report: Record<string, unknown>[] = [];
  let totalInserted = 0;
  let totalUpdated = 0;

  for (const city of cities) {
    const errors: string[] = [];
    let googleRows: RestaurantRow[] = [];
    let yelpRows: RestaurantRow[] = [];

    if (googleKey) {
      try {
        const places = await googleSearch(googleKey, city);
        const unique = [...new Map(places.map((p) => [p.id, p])).values()];
        googleRows = (await Promise.all(unique.map(async (p) => fromGoogle(p, await googlePhotoUrl(googleKey, p)))))
          .filter((r): r is RestaurantRow => r !== null);
      } catch (e) {
        errors.push(String(e));
      }
    }
    if (yelpKey) {
      try {
        yelpRows = (await yelpSearch(yelpKey, city)).map(fromYelp).filter((r): r is RestaurantRow => r !== null);
      } catch (e) {
        errors.push(String(e));
      }
    }

    const merged = mergeSources(googleRows, yelpRows).filter(inMichigan);
    let inserted = 0;
    let updated = 0;
    if (!body.dryRun && merged.length) {
      const { data, error } = await admin.rpc("import_restaurants", { p_rows: merged });
      if (error) errors.push(error.message);
      else {
        inserted = data?.[0]?.inserted ?? 0;
        updated = data?.[0]?.updated ?? 0;
      }
    }
    totalInserted += inserted;
    totalUpdated += updated;
    report.push({
      city: city.name,
      google: googleRows.length,
      yelp: yelpRows.length,
      merged: merged.length,
      inserted,
      updated,
      errors,
      ...(body.dryRun ? { sample: merged.slice(0, 3).map((r) => r.name) } : {}),
    });
  }

  return json({ inserted: totalInserted, updated: totalUpdated, cities: report });
});
