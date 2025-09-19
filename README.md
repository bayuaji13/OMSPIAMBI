# OMSPIAMBI

"One Man's Shitpost Is Another Man's Breakthrough" is an Expo/React Native app for rapidly jotting ideas and letting the crowd classify them. Signed-in users swipe through a shared deck of short posts, label each one as a shitpost, spark, or gonna implement, and keep personal lists of the ideas they want to revisit.

## Features
- Email-free account system: register/login with username + password stored in Turso, hashed with bcrypt/scrypt.
- Guided onboarding that runs once per device before dropping into the tabbed experience.
- Feed tab with a swipeable card deck built on Reanimated; quickly mark ideas or toss them aside while watching live reaction counters.
- Compose tab to add a fresh idea (280 chars max) that immediately joins the shared feed.
- Marked tab that groups your saved ideas by mark type so you can revisit sparks and implementation candidates.
- Detail route for deep-diving a single idea and inspecting the crowd counts.
- Auth debug screen (dev only) to sanity-check Turso connectivity and credential hashes.

## Stack
- Expo SDK 54 (React Native 0.81) + Expo Router for navigation.
- React Native Reanimated + Gesture Handler for swipe interactions.
- Turso (libSQL) as the single source of truth for users, sessions, posts, and post marks.
- AsyncStorage-backed helpers for persisting onboarding state and session tokens across launches.
- ULID ids via `ulidx`, crypto via `expo-crypto`, `scrypt-js`, and `bcryptjs`.

## Prerequisites
- Node.js 18+ and npm.
- A Turso database and a read-write auth token you are comfortable embedding in a prototype.
- Expo CLI (`npm install -g expo-cli`) if you prefer the global binary, otherwise use `npx`.

## Setup & Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure your environment variables:
   - Copy `.env.example` to `.env` and fill in `EXPO_PUBLIC_TURSO_URL` (e.g. `https://<db>-<region>.turso.io`) and `EXPO_PUBLIC_TURSO_TOKEN`.
   - These vars are bundled into the client; rotate tokens or add a proxy before shipping anything public.
3. Create the tables once:
   ```bash
   npm run migrate
   ```
   The script uses the same env vars and provisions `users`, `sessions`, `posts`, and `post_marks`. The in-app registration flow also calls `migrate()` on demand, but running the script keeps local automation consistent.
4. Start the development server:
   ```bash
   npx expo start
   ```
   Use the QR code/Expo Go for devices, or press `i`, `a`, or `w` for iOS Simulator, Android emulator, or web.

## Using the App
- First time launch shows onboarding; tap Continue to enter the feed.
- Register a username/password to create your Turso-backed account; subsequent logins reuse the stored session token.
- Swipe left/right to dismiss or use the action buttons to label a post. Counters update in real time based on aggregated marks.
- `Marked` shows your personal piles (Shitposts, Sparks, Gonna Implement). Pull to refresh if you are testing across devices.
- `Compose` adds a new idea and returns you to the feed.

## Project Anatomy
- `app/(tabs)/index.tsx` – swipeable feed and reaction handling.
- `hooks/useItems.ts` – Turso data access layer plus local state & counts.
- `lib/auth.ts` & `lib/turso.ts` – credential hashing, session storage, and raw SQL HTTP client.
- `app/auth/*` – onboarding, login, register, and dev utilities.
- `scripts/migrate.mjs` – node-based migration runner for CI or local bootstrapping.

## Troubleshooting
- 401/403 from Turso: confirm the token has RW scope and the URL points to the `/v2/pipeline` endpoint (the client normalizes `libsql://` URLs automatically).
- Stale onboarding or sessions: clear AsyncStorage via the device settings/simulator, or run the `Auth Debug` screen to inspect stored values.
- Reanimated or gesture errors on web: run `npm run web` only after installing Expo's web dependencies and ensure browsers support `wasm-simd` (Chrome/Edge latest).

## Next Steps
- Harden the auth flow by moving Turso writes behind a lightweight proxy before distributing widely.
- Add push notifications or email digests so sparks do not get lost.
