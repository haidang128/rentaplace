# RentAPlace

Verified room-rental marketplace for the Vietnamese community in the UK. One Expo codebase serves iOS, Android, and the web (including the bilingual marketing landing page).

**Trust model:** RentAPlace never verifies deposits itself (impossible pre-tenancy). Instead: a three-tier trust ladder — landlord declares a scheme (DPS/mydeposits/TDS) → past-tenancy certificate reviewed by the team → tenant confirms their own deposit via the scheme's free checker (the only green state) — plus renter education (the Deposit Handbook, including the lodger exception and the 1–3× court-claim leverage).

## Development

```bash
npm install
npx expo start        # web: press w · iPhone: scan the QR in Expo Go (same Wi-Fi)
npm run typecheck
npx expo export --platform web   # static web build → dist/
```

- **Expo SDK 54** — pinned because the team's Expo Go supports SDK 54. Don't upgrade without checking phones first.
- `.npmrc` sets `legacy-peer-deps` (expo-router 6 peer-dep quirk) — keep it.
- **Demo mode:** without Supabase env vars the app serves seeded demo data (`src/lib/data/demo-data.ts` + `demo-store.ts`), and the Profile tab offers persona sign-in (renter / two landlords / admin). Every flow is drivable offline.
- All copy lives in `src/locales/vi.json` / `en.json` (VI default). No hardcoded strings in components.

## Going live — checklist

### 1. Supabase (backend)

1. Create a project at [database.new](https://database.new) — **London (eu-west-2)** region.
2. `npx supabase login && npx supabase link --project-ref <ref>`
3. `npx supabase db push` (applies `supabase/migrations/`) — creates schema, RLS, trust-tier functions, storage buckets.
4. Copy `.env.example` → `.env`, fill `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API). Restart the dev server — demo mode switches off automatically.
5. Auth: enable Email OTP; add Google + Apple providers (Apple required for App Store).
6. Contract pipeline: `npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` then `npx supabase functions deploy summarize-contract`.
7. Make the first admin: `update profiles set role = 'admin' where id = '<your auth user id>';`

### 2. Web deploy

`npx expo export --platform web` → deploy `dist/` to EAS Hosting (`npx eas deploy`) or any static host. Point `rentaplace.uk` DNS at it.

### 3. Mobile builds (EAS)

Requires an Expo account, Apple Developer Program ($99/yr), and Google Play Console ($25 one-off).

```bash
npx eas build --profile production --platform all
npx eas submit --platform ios
npx eas submit --platform android
```

Note: remote push notifications need a dev build (Expo Go only supports the local scheduled reminders used by the day-30 loop). `expo-notifications` is already configured for both.

### 4. Before public launch

- [ ] Solicitor / Shelter-materials pass over Deposit Handbook + contract-summary legal copy (2-month notice figure, lodger guide)
- [ ] Analytics (PostHog) + error tracking (Sentry) — add keys and SDKs
- [ ] Confirm "real photos shot by our team" is operationally true for launch listings, or soften that copy
- [ ] Staff the admin review queue (48h SLA is promised on the landing page)

## Architecture

```
src/
  app/                 expo-router routes
    index.web.tsx      bilingual landing (web only)
    (tabs)/            browse · saved · messages · profile
    listing/[id]       detail with tier-aware trust checklist (+ lodger variant)
    landlords/[id]     public landlord profile with earned badges
    landlord/          verification · my listings (contract upload) · new listing
    tenancy/           day-30 deposit loop + end-of-tenancy review
    contract/[listingId]  approved contract summary (VI)
    chat/[id]          realtime thread with safety banner
    admin/             unified review queue (role-gated)
    handbook.tsx       the Deposit Handbook
  components/          seal, trust-chip, listing-card, landing/*, form primitives
  lib/                 i18n, auth, supabase client, data layer (demo/live), notifications
  locales/             vi.json (default) + en.json — single source of all copy
supabase/
  migrations/          schema + RLS + trust-tier fn + review-reflection trigger
  seed.sql             local demo data (mirrors src/lib/data/demo-data.ts)
  functions/summarize-contract/   Claude contract-extraction Edge Function
```

The deposit trust tier is computed in exactly one place per mode: `deposit_trust_tier()` (SQL) / the overlay in `src/lib/data/index.ts` (demo). UI renders it via `<TrustChip>` — tier 3 (tenant-confirmed) is the only green deposit state anywhere in the app.
