import { deepStrictEqual as assertEquals, ok as assert } from "node:assert/strict";
import {
  fromGoogle,
  fromYelp,
  googleHoursToWeekly,
  inferDietLevel,
  isSamePlace,
  mergeSources,
  normalizeName,
  yelpPriceToLevel,
} from "./normalize.ts";

Deno.test("googleHoursToWeekly maps days, sorts, and handles midnight/overnight", () => {
  const weekly = googleHoursToWeekly([
    { open: { day: 1, hour: 17, minute: 0 }, close: { day: 1, hour: 21, minute: 30 } },
    { open: { day: 1, hour: 11, minute: 0 }, close: { day: 1, hour: 14, minute: 0 } },
    { open: { day: 5, hour: 18, minute: 0 }, close: { day: 6, hour: 2, minute: 0 } },
    { open: { day: 6, hour: 10, minute: 0 }, close: { day: 0, hour: 0, minute: 0 } },
  ])!;
  assertEquals(weekly.mon, [["11:00", "14:00"], ["17:00", "21:30"]]);
  assertEquals(weekly.fri, [["18:00", "02:00"]]);
  assertEquals(weekly.sat, [["10:00", "24:00"]]);
  assertEquals(weekly.sun, []);
});

Deno.test("googleHoursToWeekly treats a single open-only period as 24/7", () => {
  const weekly = googleHoursToWeekly([{ open: { day: 0, hour: 0, minute: 0 } }])!;
  assertEquals(weekly.wed, [["00:00", "24:00"]]);
});

Deno.test("googleHoursToWeekly returns null without periods", () => {
  assertEquals(googleHoursToWeekly(undefined), null);
  assertEquals(googleHoursToWeekly([]), null);
});

Deno.test("inferDietLevel is conservative", () => {
  assertEquals(inferDietLevel("Seva Vegan Kitchen", []), "fully_vegan");
  assertEquals(inferDietLevel("Plant-Based Bistro", []), "fully_vegan");
  assertEquals(inferDietLevel("Veggie House", []), "vegetarian");
  assertEquals(inferDietLevel("Joe's Diner", ["vegan"]), "veg_friendly");
  assertEquals(inferDietLevel("Joe's Diner", ["vegan", "vegetarian"]), "vegetarian");
});

Deno.test("yelpPriceToLevel", () => {
  assertEquals(yelpPriceToLevel("$$"), 2);
  assertEquals(yelpPriceToLevel(undefined), null);
  assertEquals(yelpPriceToLevel("$$$$$"), null);
});

Deno.test("normalizeName strips noise words and punctuation", () => {
  assertEquals(normalizeName("The Lunch Room Café"), "lunchroom");
  assertEquals(normalizeName("Lunch Room"), "lunchroom");
});

Deno.test("isSamePlace requires proximity and a name match", () => {
  const a = { name: "The Lunch Room", lat: 42.2808, lng: -83.743 };
  assert(isSamePlace(a, { name: "Lunch Room", lat: 42.2809, lng: -83.7431 }));
  assert(!isSamePlace(a, { name: "Lunch Room", lat: 42.29, lng: -83.743 }));
  assert(!isSamePlace(a, { name: "Totally Different", lat: 42.2808, lng: -83.743 }));
});

const googlePlace = {
  id: "g1",
  displayName: { text: "Green Leaf Vegan Cafe" },
  addressComponents: [
    { longText: "100", shortText: "100", types: ["street_number"] },
    { longText: "Main Street", shortText: "Main St", types: ["route"] },
    { longText: "Ann Arbor", shortText: "Ann Arbor", types: ["locality"] },
    { longText: "Michigan", shortText: "MI", types: ["administrative_area_level_1"] },
    { longText: "48104", shortText: "48104", types: ["postal_code"] },
  ],
  location: { latitude: 42.2808, longitude: -83.743 },
  rating: 4.6,
  userRatingCount: 210,
  priceLevel: "PRICE_LEVEL_MODERATE",
  businessStatus: "OPERATIONAL",
};

Deno.test("fromGoogle builds a row", () => {
  const row = fromGoogle(googlePlace, "https://photo")!;
  assertEquals(row.address_line, "100 Main Street");
  assertEquals(row.city, "Ann Arbor");
  assertEquals(row.region, "MI");
  assertEquals(row.diet_level, "fully_vegan");
  assertEquals(row.price_level, 2);
  assert(row.tags.includes("vegan"));
});

Deno.test("fromGoogle rejects places without a usable address", () => {
  assertEquals(fromGoogle({ id: "x", displayName: { text: "X" }, location: { latitude: 1, longitude: 1 } }, null), null);
});

Deno.test("mergeSources de-duplicates across Google and Yelp", () => {
  const g = fromGoogle(googlePlace, null)!;
  const y = fromYelp({
    id: "y1",
    name: "Green Leaf Vegan Café",
    categories: [{ alias: "vegan", title: "Vegan" }, { alias: "gluten_free", title: "Gluten-Free" },
      { alias: "thai", title: "Thai" }],
    coordinates: { latitude: 42.28085, longitude: -83.74305 },
    location: { address1: "100 Main St", city: "Ann Arbor", state: "MI", zip_code: "48104" },
    price: "$$",
    image_url: "https://yelp-photo",
  })!;
  const other = fromYelp({
    id: "y2",
    name: "Veggie Hut",
    coordinates: { latitude: 42.3, longitude: -83.7 },
    location: { address1: "5 Elm", city: "Ann Arbor", state: "MI" },
  })!;
  const merged = mergeSources([g], [y, other]);
  assertEquals(merged.length, 2);
  assertEquals(merged[0].google_place_id, "g1");
  assertEquals(merged[0].yelp_id, "y1");
  assert(merged[0].tags.includes("gluten_free"));
  assertEquals(merged[0].cover_photo_url, "https://yelp-photo");
  assertEquals(merged[1].yelp_id, "y2");
});

Deno.test("fromGoogle tolerates address components without types", () => {
  const row = fromGoogle({
    ...googlePlace,
    addressComponents: [{ longText: "Plaza" }, ...googlePlace.addressComponents],
  }, null)!;
  assertEquals(row.city, "Ann Arbor");
});
