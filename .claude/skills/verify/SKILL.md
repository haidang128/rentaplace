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

Gotchas learned the hard way:

- The UI language follows the device locale: on this machine pages render in
  **English** (after a brief Vietnamese flash while the stored lang loads).
  Match English strings from `src/locales/en.json`.
- Selectors: RN-web inputs — email field is `input[inputmode="email"]`,
  password is `input[type="password"]`; buttons/links by `getByText`.
- `Alert.alert` is a no-op on web — success alerts never appear; assert on the
  navigation that follows instead.
- The exported build bakes in `.env` Supabase vars → you are driving the LIVE
  prod backend. Sign-ups are real. Use a throwaway email (auto-confirm sends no
  email) and delete the account via Profile → "Delete my account" (type DELETE)
  when done. Never touch dangngochai@gmail.com (admin) or lsealz@yahoo.com.
- `supabase db push` needs confirm bypass: `echo Y | npx supabase db push --output-format text`.
