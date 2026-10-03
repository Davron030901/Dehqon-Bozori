# Dehqon Bozori 🌿 — Frontend

Next.js 14 (App Router, TypeScript, Tailwind) storefront for **Dehqon Bozori** —
a marketplace that connects village growers in Samarkand region directly with
bazaar traders, shops and restaurants, with no middleman in between.

Phase 1 is a **connection** platform: no cart, no checkout, no payments. A buyer
finds a listing and taps 📞 Call / ✈️ Telegram / 🟢 WhatsApp. The deal happens
outside the app, the way village trade already works.

---

## Quick start

```bash
cd frontend
npm install
cp .env.local.example .env.local     # optional — see below
npm run dev                          # http://localhost:3000
```

```bash
npm run check       # verify + typecheck + lint + test — run this before pushing
npm run build       # production build (must pass before deploying)
npm run start       # serve the production build

npm run verify      # architecture rules (see below) — no dependencies needed
npm run typecheck   # tsc --noEmit
npm run lint        # next lint
npm run test        # vitest run
```

### `npm run verify`

Eight rules a type-checker cannot enforce, in `scripts/verify.mjs`:

1. Only `lib/api.ts` imports `mockData`
2. Only `lib/api.ts` calls `fetch()`
3. Only `lib/session.ts` touches `localStorage`
4. Every region slug in `strings.ts` exists in `backend/app/catalog.py`
5. Every category slug in `api.ts` exists there too — **and** every backend
   category is mapped in `FROM_API`, so no listing can silently vanish
6. **Category emoji match the bot's.** A seller who posts tomatoes and sees 🥕
   in Telegram and 🥬 here thinks they posted twice
7. **`lib/districts.ts` matches `backend/app/districts.py`** — the file is
   generated, and `npm run verify` regenerates it first
8. No stray `console.log`, and every file using hooks has `'use client'`

Rules 4 and 5 read the Python catalogue directly. That is the check that earns
its keep: a category added to the bot but not to the site would otherwise show
up as listings that exist in the database and appear nowhere on the web.

**This is a fast subset, not the authority.** The repo-root suites
(`python test_all.py` from the parent directory) cover the same rules and much
more — the real API's JSON shape against this file, Tailwind classes, the PWA
manifest, secrets, authz. `npm run verify` exists so a frontend developer with
no Python environment still gets the slug check before pushing. CI runs both.

### It runs with or without a backend

`NEXT_PUBLIC_API_URL` decides where data comes from:

| Value | What happens |
|---|---|
| unset / unreachable | The 12 demo listings in `lib/mockData.ts` are shown, and a banner says so plainly. Perfect for design work and a first Vercel preview. |
| `http://localhost:8000` | Real listings from the Dehqon Bozori API — including everything sellers posted through the Telegram bot. |

Nothing else changes. Every page goes through `lib/api.ts`, which falls back to
the demo data whenever the API does not answer within 6 seconds.

---

## Folder structure

```
frontend/
├── app/
│   ├── layout.tsx                     Header + Footer, Inter font, metadata, PWA
│   ├── page.tsx                       Homepage — filters in the URL, served by the API
│   ├── loading.tsx  not-found.tsx  sitemap.ts  robots.ts
│   ├── mahsulot/[id]/page.tsx         Product detail: contact, ♡, share, report, similar
│   ├── dehqon/[id]/page.tsx           A seller's public page
│   ├── saqlangan/page.tsx             Saved listings (device, merged into the account)
│   └── sotuvchi/
│       ├── royxatdan-otish/page.tsx   Seller profile
│       ├── elon-qoshish/page.tsx      Add a listing (asks for Telegram sign-in first)
│       ├── tahrirlash/[id]/page.tsx   Edit any field of a listing
│       ├── kabinet/page.tsx           Seller dashboard — sold, edit, delete, buyer contacts
│       └── admin/page.tsx             Founder's panel — stats, post for a grower,
│                                      moderate everything, buyer reports
│
├── components/
│   ├── Header.tsx  Footer.tsx  Badge.tsx
│   ├── SearchBar.tsx                  debounced, 400 ms, survives server round-trips
│   ├── CategoryChips.tsx              all 11 categories, with counts
│   ├── FilterBar.tsx                  region + district + sort, with counts
│   ├── ProductCard.tsx  ProductGrid.tsx
│   ├── FavoriteButton.tsx  ShareButton.tsx  ReportButton.tsx
│   ├── ListingForm.tsx                one form for add / edit / admin
│   ├── ContactButtons.tsx             Call / Telegram / WhatsApp
│   ├── HomeFeed.tsx                   URL-driven filters + "load more"
│   ├── LoginGate.tsx                  passwordless Telegram sign-in
│   └── AutoRefresh.tsx  PwaRegister.tsx
│
├── lib/
│   ├── types.ts                       Listing, Seller, filters, form inputs
│   ├── api.ts                         ← the only place that fetches anything
│   ├── favorites.ts                   one store for every ♡
│   ├── districts.ts                   GENERATED — 14 regions, 175 districts + cities
│   ├── mockData.ts                    14 demo listings
│   ├── strings.ts                     every UI string; the 11 categories and 7 units
│   ├── format.ts                      price / date / tel: helpers
│   └── session.ts                     token, favourites, drafts (localStorage)
│
├── scripts/verify.mjs                 architecture rules, zero dependencies
├── tests/                             vitest — filters ↔ URL, request bodies, formatting
└── public/                            icon.svg, manifest.webmanifest, sw.js
```

### The one rule worth keeping

**No component imports `mockData` or calls `fetch`.** They call `getListings()`,
`getListingById()`, `createListing()` and friends from `lib/api.ts`. That is what
makes the data source swappable — and both `npm run verify` and the root
`tests/test_frontend.py` enforce it, so it stays true rather than slowly
stopping being true. (Contact analytics used to be the exception: `ContactButtons`
called `fetch` directly. It now goes through `reportContact()` in `lib/api.ts`.)

### The admin page

`/sotuvchi/admin` is the founder's panel: totals and breakdowns, a form that
posts a listing on behalf of a grower who phoned, and a moderation list over
every seller's listings. Whether someone is an admin is decided by the backend
(`is_admin` on `/api/auth/me`, driven by `ADMIN_IDS`) and re-checked on every
request — the page only hides a panel that would 403 anyway, which is not a
security boundary and is not pretending to be one.

The same three jobs are available in the Telegram bot under `/admin`, for when
you are standing in a field rather than sitting at a desk.

---

## How the homepage works

The filters live in the URL — `/?category=honey&region=samarkand&sort=cheapest`
— and the server component asks the API for exactly that page. A filtered view
is therefore a link a trader can forward in Telegram, the back button works,
and the browser never downloads the whole bazaar to show 24 listings of it.
(It used to fetch the first 100 listings and filter them in the browser, so
listing number 101 was invisible to every buyer.) "Yana ko’rsatish" appends the
next page from the client.

Filter options come from `/api/facets`, which counts active listings per
category, region and district — so a chip or a dropdown entry never leads to
an empty page, and each one shows how many listings are behind it.

- **Category** — all eleven of the bot's categories; empty ones are hidden
- **Region** — only regions that have listings, in a fixed order (Samarkand
  first). Not `localeCompare`: Node's ICU and Chrome sort "Toshkent shahri" /
  "Toshkent viloyati" differently, and the page failed to hydrate
- **District** — appears once a region is chosen, cities first
- **Sort** — newest, cheaper, dearer, most viewed

It also refreshes itself every 30 seconds via `components/AutoRefresh.tsx`.
A hidden tab and an offline device are both skipped, because that is data a
buyer on a village plan pays for and never sees.

**Views are counted honestly.** The detail page fetches once per request
(`react.cache`), and links to listings never prefetch — a prefetch renders the
page, and the homepage alone used to credit 24 listings with views nobody made.
`npm run verify` fails if either comes back.

---

## Design notes

- Primary green `#1D9E75` is registered as `primary` in `tailwind.config.ts`
  with a full 50–900 ramp; the warm background is `sand`.
- Mobile-first throughout: 2-column card grid on phones, 3 on tablets, 4 on
  desktop.
- `next/image` everywhere with explicit `sizes`, lazy by default, and
  `priority` on the first four cards so the top of the feed paints fast.
- No photo? The card falls back to the category emoji — village sellers often
  post without one, and an empty grey box looks broken.
- Inter via `next/font/google` with `display: swap`, self-hosted at build time
  (no render-blocking request to Google).

---

## Internationalisation

Every string lives in `lib/strings.ts`. Nothing is hard-coded in a component —
there is a verification check for this. To add Russian:

1. Duplicate the `strings` object as `strings_ru`
2. Export a `useStrings()` hook (or a server-side `getStrings(locale)`) that
   picks one
3. Replace `import { strings }` with that accessor

No component markup needs to change. `categoryLabels` and `regions` are already
keyed by stable slugs, so labels can be translated without touching data.

---

## Deploying to Vercel

1. Push the repo to GitHub.
2. Vercel → **New Project** → import the repo.
3. **Set Root Directory to `frontend`** — the repo root holds the Python
   backend, so Vercel must be told where the Next.js app lives.
4. Add environment variables:
   - `NEXT_PUBLIC_API_URL` — e.g. `https://dehqon-bozori.onrender.com`
   - `NEXT_PUBLIC_BOT_USERNAME` — e.g. `DehqonBozoriBot`
   - `NEXT_PUBLIC_SITE_URL` — this site's own URL, for the sitemap and share links
   - `NEXT_PUBLIC_ANDROID_APP_URL` — optional; shows a download-the-app button
5. Deploy. Framework preset, build command and output directory are all
   detected automatically — there is no custom server.

If you deploy **before** the backend exists, just leave `NEXT_PUBLIC_API_URL`
empty. The site builds and runs on demo data.

### Images

`next.config.js` derives the allowed image host from `NEXT_PUBLIC_API_URL` at
build time, so photos served by the backend work in every environment without
editing a hard-coded domain list. (It uses `images.remotePatterns`, which
replaced the deprecated `images.domains` in Next 14.)

---

## Connecting a different backend later

Everything the frontend needs is behind ten functions in `lib/api.ts`. To move
to Supabase, replace their bodies — the types they return stay identical:

```ts
// before
export async function getListings(): Promise<DataResult<Listing[]>> {
  const page = await request<ApiPage>('/api/listings?per_page=100');
  return { data: page.items.map(mapListing), isDemo: false };
}

// after
export async function getListings(): Promise<DataResult<Listing[]>> {
  const { data } = await supabase.from('listings').select('*').eq('status', 'active');
  return { data: (data ?? []).map(mapListing), isDemo: false };
}
```

`.env.local.example` already reserves `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` for that day. Nothing reads them today.

The `mapListing()` function is the seam that matters: the API speaks snake_case
and its own category slugs, the UI speaks the `Listing` interface. Keep that
translation in one place and swapping backends stays a one-file change.

---

## Seller sign-in

There is no password and no SMS gateway — an SMS contract costs money that a
village project does not have. Instead the seller taps a `t.me` deep link, the
Telegram bot approves it, and the browser receives a token. The web account
**is** their bot account, so listings follow them between the two.

If no backend is configured, the seller forms still work: submissions are saved
to `localStorage`, shown in the cabinet marked *Yuborilmagan* ("not sent"), and
the UI says clearly that they are not published yet.

---

*Vositachisiz. 🌿*
