---
name: verify
description: Build, serve and browser-drive the RentAPlace web app to verify changes end-to-end against the live Supabase backend.
---

# Verifying RentAPlace changes

The fastest real surface is the static web build driven by Playwright using the
system Edge browser (no browser download needed).

```bash
npx expo export --platform web        # prerenders every route; catches SSR crashes
npx serve dist -l 3999                # background; static build = what prod serves
```

Playwright is NOT a repo dep — install it in a scratch dir (`npm i playwright`)
and launch with `chromium.launch({ channel: "msedge", headless: true })`.

## Demo-mode build — verify UI without touching prod

Most UI work can be driven without writing a single row to the live database:

```bash
EXPO_NO_DOTENV=1 npx expo export --platform web --output-dir dist-demo --clear
npx serve dist-demo -l 3998
```

`EXPO_NO_DOTENV=1` is what makes this work — passing empty `EXPO_PUBLIC_*` vars
on the command line does **not** override `.env`, and you silently get a
prod-backed build. Always confirm: `grep -c "$EXPO_PUBLIC_SUPABASE_URL"
dist-demo/_expo/static/js/web/entry-*.js` must print `0`.

Demo mode signs in via persona buttons on /profile ("Renter (Mai)", "Verified
landlord (Chú Hùng)", …) and persists to localStorage under
`rentaplace.demo-state.v1` — write that key with `page.evaluate` to set up
states the UI can't otherwise reach (e.g. an ended-but-unreviewed tenancy),
then reload, since the store caches state in a module-level variable.

Prefer this over the live backend whenever a live test would leave residue.
Creating a listing files a `review_queue` row that the anon key **cannot**
delete — deleting the throwaway account cascades the listing but orphans the
queue row, which then shows in the admin queue forever with a raw uuid label.

Gotchas learned the hard way:

- `npx serve` 404s on hard loads of dynamic routes (`/tenancy/<id>`,
  `/listing/<id>`) — it can't map them to the prerendered `[id].html`. EAS
  Hosting resolves them fine, so verify deep links against the deployment URL,
  and use in-app navigation locally.
- Route types are stale until a dev server boots: after adding a route, typed
  `Link href` fails to typecheck. `npx expo export` does NOT regenerate them —
  run `timeout 60 npx expo start --web --port 8099` once, then `tsc`.

- The UI language follows the device locale: on this machine pages render in
  **English** (after a brief Vietnamese flash while the stored lang loads).
  Match English strings from `src/locales/en.json`.
- Selectors: RN-web inputs — email field is `input[inputmode="email"]`,
  password is `input[type="password"]`; buttons/links by `getByText`.
- `Alert.alert` is a no-op on web. App code should use `components/notice.tsx`
  (`useNotice` + `<Notice>`) instead — assert on that inline text.
- The exported build bakes in `.env` Supabase vars → you are driving the LIVE
  prod backend. Sign-ups are real. Use a throwaway email (auto-confirm sends no
  email) and delete the account via Profile → "Delete my account" (type DELETE)
  when done. Never touch dangngochai@gmail.com (admin) or lsealz@yahoo.com.
- `supabase db push` needs confirm bypass: `echo Y | npx supabase db push --output-format text`.
