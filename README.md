# VegEats

Find vegan and vegetarian restaurants near you in Michigan and check their menus against your diet: vegan, vegetarian, allergen-free, Jain, sattvic, halal or kosher vegetarian, and health-focused options.

iOS and Android app built with Expo (React Native + TypeScript) and Supabase.

## Features

- **Discover**: restaurants near you or a chosen Michigan city, with search across names, cuisines and dishes.
- **Filters**: 19 diet, allergen, religious and health tags, type of place, distance, open now, and sort by distance or rating.
- **Map**: Apple Maps on iOS, Google Maps on Android, with a "search this area" button.
- **Restaurant pages**: menus grouped by section, a "Fits your diet" mark on each matching dish, hours with open-now status, photos, reviews, and directions, call and website links.
- **Community**: reviews and ratings, adding restaurants and dishes, menu and dish photo uploads, and reporting incorrect info. Admins moderate everything in a review queue.
- **Accounts**: email and password, Google, and Apple sign-in. Your diet preferences sync to your account.
- **Appearance**: dark mode, following the device or set manually.
- **Data import**: an Edge Function that loads listings from Google Places and Yelp.

## Project layout

```
src/app/            Expo Router screens (tabs, restaurant pages, modals)
src/api/            React Query hooks for each Supabase table
src/components/     UI kit (components/ui) and domain components
src/lib/            Pure logic: hours, tags, formatting, validation, Supabase client
src/stores/         Persisted app state (filters, preferences)
src/theme/          Design tokens and theme hook
supabase/migrations SQL schema, row-level security, search functions
supabase/functions  import-restaurants Edge Function (Deno)
.maestro/           End-to-end UI flows
```

## Quick start

```bash
npm install
cp .env.example .env          # fill in the Supabase URL and publishable key
npx expo run:ios              # builds and opens the iOS Simulator
npx expo run:android          # builds and opens the Android Emulator
```

Full setup, including auth providers, API keys, admin access and the restaurant import, is in [docs/SETUP.md](docs/SETUP.md).

## Checks

```bash
npm run typecheck             # TypeScript
npx expo lint                 # ESLint
npm test                      # Jest unit and component tests
npm run test:functions        # Deno tests for the import logic
npm run e2e                   # Maestro flows on a running simulator or emulator
```
