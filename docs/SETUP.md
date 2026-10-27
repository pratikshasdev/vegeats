# VegEats setup

## 1. Supabase (backend)

The project `vegeats` is already set up in region `us-east-2`, with the schema from `supabase/migrations` applied.

- **Dashboard:** https://supabase.com/dashboard/project/vvufwgsulrdkpmrcmjtv
- **App config:** `.env` holds `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Both are public values; row-level security protects the data.

### Auth URL configuration

Go to **Authentication → URL Configuration** and set:

- **Site URL:** `vegeats://auth/callback`
- **Redirect URLs:** add `vegeats://**` and `exp://**`. The `exp://**` entry is only needed for Expo Go.

### Google sign-in

1. In Google Cloud Console, go to **APIs & Services → Credentials** and create an **OAuth client ID** of type **Web application**.
2. Add `https://vvufwgsulrdkpmrcmjtv.supabase.co/auth/v1/callback` as an authorized redirect URI.
3. In Supabase, open **Authentication → Providers → Google**, enable it, and paste the client ID and secret.

### Apple sign-in

You need an Apple Developer account ($99/yr).

1. In the Apple Developer portal, enable **Sign in with Apple** for the App ID `com.pratikshasdev.vegeats`.
2. For the browser flow on Android, also create a Services ID and a key.
3. In Supabase, open **Authentication → Providers → Apple**, enable it, and add `com.pratikshasdev.vegeats` under **Client IDs**. Native iOS sign-in only needs that bundle ID.

### Making yourself an admin

Sign up in the app, then run this in the **SQL Editor**:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

Admins see **Profile → Review queue**, where they approve or reject submissions and resolve reports.

## 2. Restaurant data (Google Places + Yelp)

1. In Google Cloud, enable **Places API (New)** and create an API key.
2. At https://www.yelp.com/developers, create an app to get a Yelp Fusion API key.
3. In Supabase, go to **Edge Functions → Secrets** and add two secrets:
   - `GOOGLE_PLACES_API_KEY`
   - `YELP_API_KEY`
4. Run the import. Use the service-role key from **Settings → API Keys**, or an admin user's access token:

```bash
curl -X POST https://vvufwgsulrdkpmrcmjtv.supabase.co/functions/v1/import-restaurants \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"cities": ["Ann Arbor", "Detroit"], "dryRun": true}'
```

Remove `"dryRun": true` to write the results, and leave out `"cities"` to import every Michigan city in the function. Running it again refreshes hours, ratings and photos. It never downgrades a diet level or removes tags an admin set.

Imported diet levels are conservative: a place is only marked "100% vegan" or "Vegetarian" when its name or categories say so. Correct the rest from the review queue or the SQL editor.

## 3. Maps on Android

1. In Google Cloud, enable **Maps SDK for Android**.
2. Create an API key restricted to Android apps:
   - Package: `com.pratikshasdev.vegeats`
   - SHA-1: run `cd android && ./gradlew signingReport` after the first `expo run:android`
3. Add the key to `.env` as `GOOGLE_MAPS_ANDROID_API_KEY=...`, then rebuild with `npx expo run:android`.

iOS uses Apple Maps and needs no key.

## 4. Running on simulators

Requirements:

- Xcode 27 and its iOS Simulator
- Android Studio with an emulator (for example `Pixel_6_API_33`)
- JDK 17 (`JAVA_HOME`)
- Node 20 or later

```bash
npm install
npx expo run:ios                               # iOS Simulator
npx expo run:android                           # Android Emulator (start it first: emulator -avd Medium_Phone_API_35)
npx expo start                                 # later runs: reuse the installed dev build
```

### End-to-end tests (Maestro)

With the app installed on a running simulator or emulator:

```bash
maestro test -e APP_ID=com.pratikshasdev.vegeats .maestro
```

`restaurant-detail` needs at least one approved restaurant near Ann Arbor, so run the import first.

### Driving the emulator with agent-device

```bash
agent-device open com.pratikshasdev.vegeats --platform android --foreground
```

## 5. Cloud builds (EAS)

```bash
eas login
eas init                                        # links the project and sets EAS_PROJECT_ID
eas build --profile development --platform ios  # simulator build
eas build --profile preview --platform android  # installable APK
```

Store builds (`--profile production`) need the Apple Developer and Google Play accounts.

## 6. Subscriptions (future)

`src/lib/subscriptions.ts` is the seam for RevenueCat. It is off in v1, and every feature is free. The file lists the steps to turn it on.
