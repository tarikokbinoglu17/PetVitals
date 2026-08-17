# PetVitals

Global social and health platform for pets — a digital health passport,
vaccine reminders, and a pet-focused social network, built to support any
species, not just dogs and cats.

This repository currently contains the **foundational scaffold**: project
setup, navigation, authentication, i18n, and the Supabase data layer. Social
feed, pet matching, and most screens are intentionally not built yet — see
[Roadmap](#roadmap).

## Tech stack

| Layer         | Choice                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| App framework | [Expo](https://expo.dev) (SDK 57) + React Native 0.86                                                  |
| Language      | TypeScript (strict mode)                                                                               |
| Routing       | [Expo Router](https://docs.expo.dev/router/introduction/) (file-based, typed routes)                   |
| Backend       | [Supabase](https://supabase.com) — Postgres, Auth, Storage                                             |
| Data access   | Row Level Security (RLS) — the primary authorization layer, enforced in Postgres, not just in app code |
| State         | [Zustand](https://github.com/pmndrs/zustand) for global state (auth), local `useState` elsewhere       |
| Localization  | [i18next](https://www.i18next.com) + `react-i18next` + `expo-localization`                             |

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Create a new project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, run `supabase/migrations/0001_init.sql` (see
   `supabase/README.md` for details). This creates the schema and RLS
   policies.
3. In **Project Settings → API**, copy the **Project URL** and **anon public
   key**.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` from
step 2. These are safe to expose in the client bundle — real protection
comes from RLS, not from hiding the anon key. Never put the `service_role`
key in this app.

### 4. Run the app

```bash
npm run start   # then press i / a / w, or scan the QR code with Expo Go
```

### Other useful scripts

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # expo lint (eslint-config-expo)
npm run format       # prettier --write .
```

## Architecture

```
src/
  app/                Expo Router routes (file-based navigation)
    _layout.tsx          Root layout: i18n init, auth bootstrap, splash screen
    (auth)/               Unauthenticated stack — redirects to (app) once signed in
      _layout.tsx
      index.tsx             Sign in  (route: "/")
      sign-up.tsx
      forgot-password.tsx
    (app)/                Authenticated tab stack — redirects to (auth) if signed out
      _layout.tsx           Tabs navigator (guarded)
      home.tsx               Feed placeholder
      pets.tsx                Pet list placeholder
      profile.tsx              Profile + sign out
  components/
    ui/                 Small reusable UI primitives (Button, TextField, ScreenContainer, LoadingView)
  constants/            Non-secret app constants: theme colors, env var loading, locale/reminder config
  hooks/                Reusable hooks (useAuth, useThemeColors)
  i18n/                 i18next setup + locales/{en,tr,de,es}.json
  services/
    supabase/            Supabase client + one service module per domain (auth, pet, vaccine, healthRecord)
  store/                 Zustand stores (authStore: session + profile + auth actions)
  types/                 Domain types (User, Pet, VaccineRecord, HealthRecord) + hand-written Supabase Database type
  utils/                 Small stateless helpers (validation, date formatting)
supabase/
  migrations/           SQL schema + RLS policies, applied manually via the Supabase SQL editor or CLI
```

**Why this split:** screens (`app/`) stay thin and only orchestrate hooks,
components, and services. Business/data logic lives in `services/`, shared
UI state in `store/`, and nothing user-facing is hard-coded — all strings
flow through `i18n/`.

### Authentication flow

- `store/authStore.ts` owns the session lifecycle: on app start it loads the
  current Supabase session, subscribes to `onAuthStateChange`, and fetches
  the matching `profiles` row.
- `(auth)/_layout.tsx` and `(app)/_layout.tsx` both read auth state via the
  `useAuth()` hook and redirect with `<Redirect>` — there's no manual
  `navigation.replace()` calls to keep in sync.
- Sign-up passes `full_name` and `role` as auth user metadata; a Postgres
  trigger (`handle_new_user`, see the migration) creates the matching
  `profiles` row server-side. The client never inserts its own profile row,
  which closes off a spoofing vector (a user can't insert a profile with
  someone else's `id` or an arbitrary `role`).

### Data & security model

- Every table that holds user data is protected by **Row Level Security**,
  not just app-level checks — see `supabase/migrations/0001_init.sql`. A
  user can only see/edit their own `pets`, and only the `vaccine_records` /
  `health_records` that belong to a pet they own (enforced via an `exists`
  subquery on `pets.owner_id`).
- Health data (`vaccine_records`, `health_records`) is modeled in its own
  tables, separate from anything social. When the social graph (posts,
  follows, comments) is added later, it will not share tables or RLS
  policies with health data, so a bug in social-feature access rules can't
  leak health records.
- `src/types/database.types.ts` is currently hand-written to mirror the SQL
  migration. Regenerate it from the live database once the Supabase project
  exists (command in `supabase/README.md`) so it can never silently drift
  from the real schema.

### Localization

Supported languages at launch: English (default), Turkish, German, Spanish
— see `src/i18n/locales/`. The device's locale is detected on startup via
`expo-localization` and falls back to English. No user-facing string should
ever be hard-coded in a component; add a new key to all four locale files
instead.

## Roadmap

This scaffold covers project setup, navigation, auth, i18n, and the data
layer for pets/vaccines/health records. Not yet built (see the phased
development order agreed on for this project):

1. Pet management screens (create/edit/list, using `services/supabase/pet.service.ts`)
2. Digital Health Passport UI (timeline) + Vaccine System UI, including
   local push notification scheduling for reminders
3. Notification infrastructure beyond vaccines (vet visits, medications)
4. Social network (profiles, posts, feed, follow, comments, likes, messaging)
5. Pet matching

## Environment

This project does not yet configure App Store/Play Store deployment or any
paid services — local development via Expo Go / dev builds only, using
Supabase's free tier.
