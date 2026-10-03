# Dehqon Bozori 🌿 — Backend + Telegram Bot

FastAPI API and an aiogram 3 Telegram bot, in one container, sharing one
database. A listing posted in the bot is on the website instantly; a listing
posted on the website appears in the seller's *E'lonlarim* inside the bot.

```
backend/
├── Dockerfile              multi-stage, non-root, binds $PORT
├── render.yaml             Render blueprint (one Docker web service)
├── requirements.txt
├── .env.example
├── supabase/
│   ├── schema.sql          tables, indexes, RLS policies
│   ├── seed.sql            6 sellers + 12 listings, so a fresh project is not empty
│   └── migrations/         numbered changes for an already-live database
├── test_platform.py        86 end-to-end checks
├── web/                    ⚠️ ARCHIVED — the original vanilla-JS PWA.
│                              Superseded by frontend/ (Next.js). Not served
│                              unless SERVE_LEGACY_WEB=true.
└── app/
    ├── main.py             entrypoint — API + bot via asyncio
    ├── config.py           every setting + check_config() startup warnings
    ├── catalog.py          categories / regions / units (uz + ru)
    ├── districts.py        14 regions → 205 districts and cities
    ├── db/
    │   ├── database.py     SQLAlchemy models ← single source of truth
    │   └── queries.py      queries + formatting, used by API *and* bot
    ├── models/schemas.py   Pydantic request/response models
    ├── api/
    │   ├── app.py          FastAPI app, CORS, static mounts
    │   ├── routes_public.py    /health /listings /sellers /contact-events
    │   ├── routes_listings.py  buyer reads, contact, photo proxy
    │   ├── routes_seller.py    authenticated seller CRUD
    │   ├── routes_admin.py     founder's dashboard
    │   ├── routes_auth.py      passwordless Telegram login
    │   ├── serializers.py  ORM → JSON, labels resolved server-side
    │   ├── media.py        photo storage + Telegram bridge
    │   └── notify.py       web → Telegram notifications
    └── bot/
        ├── keyboards.py  states.py  texts.py  middlewares.py
        └── handlers/   start · add_listing · buyer · profile · web · admin
```

---

## Quick start

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # fill in BOT_TOKEN, BOT_USERNAME, ADMIN_IDS

python -m app.main          # API + bot        → http://localhost:8000
python -m app.main web      # API only
python -m app.main bot      # bot only
python test_platform.py     # 86 checks, on a throwaway database
```

`/api/docs` gives you interactive OpenAPI documentation. `/` returns a small
JSON signpost — the storefront is the Next.js app in `frontend/`, not this
service.

### Half-configured settings announce themselves

On boot, `check_config()` prints a warning for every setting that would
otherwise fail silently — an empty `BOT_USERNAME` (dead login link), an empty
`ADMIN_IDS` (locked out of your own dashboard), an empty
`PHOTO_ARCHIVE_CHAT_ID` in production (photos lost on the next deploy). They are
warnings, not errors: buyers can browse the site without any of them.

### With Docker

```bash
docker build -t dehqon-bozori .
docker run --rm -p 8000:8000 --env-file .env -e PORT=8000 dehqon-bozori
```

---

## Setting up Supabase (free tier)

### 1. Create the project

1. Sign up at <https://supabase.com> (GitHub login is fastest).
2. **New Project** → name it `dehqon-bozori`, set a strong database password
   (**save it** — you need it for the connection string), pick the region
   closest to Uzbekistan (Frankfurt is usually the best available).
3. Choose the **Free** plan. No card required.
4. Wait ~2 minutes for provisioning.

### 2. Create the tables

Dashboard → **SQL Editor** → **New query** → paste all of
[`supabase/schema.sql`](supabase/schema.sql) → **Run**.

The backend would create the tables itself on first boot, but running the
script is still worth it: only it sets up the Row Level Security policies that
let the frontend read listings directly with the anon key.

### 3. Get the connection string

Dashboard → **Connect** (button at the top) → you will see three options:
*Direct connection*, *Session pooler*, *Transaction pooler*.

### ⚠️ Use the **Session pooler**, not the direct connection

This one detail decides whether the deploy works at all.

Supabase's direct connection (`db.<ref>.supabase.co`) resolves to an **IPv6**
address only, unless you buy the IPv4 add-on. **Render has no outbound IPv6.**
So a direct connection string fails on Render with `ENETUNREACH` — asyncpg
resolves the AAAA record, tries it, and there is no route.

The **Session pooler** goes through `pooler.supabase.com`, which is IPv4 on
every tier, including free. Take that string, change the scheme to
`postgresql+asyncpg://`, and URL-encode special characters in the password
(`@` → `%40`, `#` → `%23`, `$` → `%24`):

```
DATABASE_URL=postgresql+asyncpg://postgres.abcdefgh:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

Note the username is `postgres.<project-ref>`, not plain `postgres`.

**Session** mode (port 5432) keeps a connection for the life of the session, so
asyncpg's prepared statements work normally. If you ever switch to the
**Transaction** pooler (port 6543), you must append
`?prepared_statement_cache_size=0`, because prepared statements do not survive
PgBouncer in transaction mode.

Local development is unaffected — SQLite needs none of this.

### 4. Which Supabase keys does the backend need?

**None.** This is worth being clear about, because the deployment plan assumed
`supabase-py`.

The backend talks to Supabase over the **Postgres protocol** with SQLAlchemy,
not over the REST API, so it authenticates with the database password inside
`DATABASE_URL`. There is no `SUPABASE_SERVICE_ROLE_KEY` to leak, which is one
fewer secret to protect. Same database, same Supabase project, same dashboard —
just a different door.

`SUPABASE_ANON_KEY` is only needed if the **frontend** reads Supabase directly
from the browser. That key belongs in Vercel's environment, not here.

### ⚠️ Free-tier projects pause

Supabase pauses a free project after **7 days with no activity**, and the
database stops answering until you restore it from the dashboard. During the
MVP, either keep it warm with real traffic or restore it when you resume work.
Paid tiers do not pause.

---

## Deploying to Render

1. Push the repo to GitHub (both `backend/` and `frontend/`).
2. Render → **New** → **Web Service** → connect the repo.
3. **Root Directory:** `backend`
4. **Runtime:** Docker — the `Dockerfile` is detected automatically.
5. **Instance type:** Free to start.
6. Add environment variables (see below), then deploy. The health check hits
   `/health`, which touches the database — so a wrong `DATABASE_URL` fails the
   deploy instead of quietly serving a dead service.

Or use the blueprint: **New → Blueprint** → pick the repo, and `render.yaml`
does steps 3–5 for you.

### Environment variables

| Variable | Required | What it does |
|---|---|---|
| `BOT_TOKEN` | ✅ | From @BotFather |
| `BOT_USERNAME` | ✅ | Bot's @name without the @ — website login builds `t.me/<name>?start=login_…` |
| `DATABASE_URL` | ✅ | Supabase Postgres connection string |
| `ADMIN_IDS` | recommended | Your Telegram user id — unlocks `/stats` and `/admin`. Ask @userinfobot |
| `ADMIN_API_TOKEN` | recommended | Secret for `POST /listings`, `POST /sellers`, `PATCH /sold`. **Unset = those endpoints are disabled**, never open |
| `PHOTO_ARCHIVE_CHAT_ID` | recommended | See *Photos* below |
| `PUBLIC_BASE_URL` | ✅ | This service's public URL |
| `SITE_URL` | recommended | The storefront's URL (Vercel). The bot's "open the website" button and admin notifications link here; unset falls back to `PUBLIC_BASE_URL`, which is the API |
| `ANDROID_APP_URL` | optional | APK / Play Store link. When set, the bot offers a download button and `/api/meta` exposes it |
| `CORS_ORIGINS` | recommended | Your Vercel domain. `*` is fine at first, tighten later |
| `SERVE_LEGACY_WEB` | optional | `true` brings back the archived `web/` PWA at `/`. Default `false` |
| `PORT` | auto | Render injects it; the app binds to it |

### Two free-tier caveats worth planning around

**Cold starts.** A free service sleeps after ~15 minutes of inactivity and takes
30–60 seconds to wake. For a website that is a slow first page load; for a bot
it means a seller's `/start` may go unanswered until the container wakes. The
usual fix is an uptime monitor pinging `/health` every 10 minutes
(UptimeRobot's free tier does this), but be honest that this keeps a free
instance permanently awake, which Render's terms discourage. The clean fix is
the $7/month Starter instance. Decide before real sellers depend on it.

**The disk is ephemeral.** Everything written inside the container is destroyed
on every deploy and restart. Two consequences:

- Use **Supabase Postgres**, not SQLite, in production. A SQLite file on Render
  free will be silently wiped.
- Set `PHOTO_ARCHIVE_CHAT_ID` so photos survive (below).

---

## Photos

The bot receives photos as Telegram `file_id`s — permanent, free, and hosted by
Telegram. The website uploads real files, which land in `media/uploads/` and
would vanish on the next deploy.

Set `PHOTO_ARCHIVE_CHAT_ID` and every website upload is also pushed into
Telegram, and the returned `file_id` is stored on the listing. Telegram becomes
the durable photo store; the local file degrades to a cache. `GET /api/photo/<id>`
serves the local copy when it exists and falls back to re-fetching from
Telegram when it does not — so photos keep working after a restart.

To get a chat id: create a private channel, add your bot as an administrator,
forward any message from it to @userinfobot, and use the id (it looks like
`-1001234567890`). Your own Telegram user id works too, though your Saved
Messages will fill up with produce.

---

## API

`/api/docs` has the interactive reference. The shape at a glance:

**Public — the documented REST surface**

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | Render health check; touches the DB |
| GET | `/listings` | Filter, search, sort, paginate |
| GET | `/listings/{id}` | Detail; increments the view counter |
| POST | `/contact-events` | Log a contact tap — anonymous |
| POST | `/sellers` | 🔒 `X-Admin-Token` |
| POST | `/listings` | 🔒 `X-Admin-Token` — create for any seller, matched by phone |
| PATCH | `/listings/{id}/sold` | 🔒 `X-Admin-Token` |

**Buyer-facing, `/api` prefix — anonymous**

| Method | Path | Notes |
|---|---|---|
| GET | `/api/listings` | `q`, `category`, `region`, `district`, `min_price`, `max_price`, `sort`, `seller_id`, `ids=1,2,3` (a device's favourites), `include_sold`, `page`, `per_page`, `lang=uz\|ru` |
| GET | `/api/listings/{id}` | Detail; counts a view unless `count_view=false` |
| GET | `/api/listings/{id}/similar` | Same category, same region first |
| GET | `/api/facets` | Active-listing counts per category / region / district (`region=` scopes districts) |
| GET | `/api/sellers/{id}` | A seller's public card; their listings via `/api/listings?seller_id=` |
| POST | `/api/listings/{id}/contact` | Records the lead and pings the seller on Telegram — at most once per buyer per listing per 10 min. `source=web\|app` |
| POST | `/api/listings/{id}/report` | Spam / fraud / wrong price / sold / other — admins get a Telegram message. Rate-limited |
| GET | `/api/photo/{id}`, `/api/meta`, `/api/stats` | Photos from either surface; catalogue incl. districts; public numbers |

**Seller, bearer token** — `/api/my/listings` (GET, POST, PATCH any field,
DELETE; GET includes `contacts_count`), `/api/my/upload`,
`/api/my/favorites` (GET, `ids`, PUT/DELETE `{id}`, POST `sync`),
`/api/auth/me` (GET, PATCH), `/api/auth/logout` (this device; `everywhere=true`
for all). These can only ever act on the caller's own data.

**Admin, bearer token + `ADMIN_IDS`** — `/api/admin/dashboard`,
`/api/admin/listings`, `/api/admin/reports` (GET, PATCH `{id}` to resolve).

### Two ways to authenticate, and why

- **Bearer token** — a *person*, proven by tapping a `t.me` deep link that the
  bot approves. Scoped to that seller's own data.
- **`X-Admin-Token`** — a *machine*, for endpoints that write on behalf of
  anyone. Fails closed: unset means disabled.

They are separate on purpose. A leaked seller token exposes one seller; there
is no path from a seller session to writing another seller's listings.

---

## How the bot and the API stay in sync

There is no sync. `app/db/database.py` (models) and `app/db/queries.py`
(queries) are imported by both, so there is one schema and one implementation of
every rule — including `get_or_create_offline_seller()`, which both the bot's
`/admin` command and the admin HTTP endpoints use to attach a listing to a
grower. `test_platform.py` asserts this both ways: a row written through the
bot's data layer is served by the API, and a listing created through the API is
found by the bot's own query functions.

**Sellers who phone instead of typing.** Most village growers will call the
founder rather than use either interface. There are three ways to post for them,
and all three end up in the same place:

| Where | How | When it is the right one |
|---|---|---|
| Bot, `/admin` | `app/bot/handlers/admin.py` | You are in a field holding a phone |
| Website, `/sotuvchi/admin` | Next.js admin page | You are at a desk, with a list |
| HTTP, `POST /listings` | `X-Admin-Token` | A script or an import |

All three call `get_or_create_offline_seller()` in `app/db/queries.py`, so the
matching rule is identical: a seller record is created or reused, **matched on
phone number**, with a synthetic **negative** id that can never collide with a
real Telegram id. Call the same grower twice and you get one seller with two
listings, not two sellers. If that person later starts the bot, merge the rows.

`/admin` and `/stats` are visible in the bot's command menu to everyone and
refuse anyone whose Telegram id is not in `ADMIN_IDS` — a hidden command is not
a security boundary, so the check is on every handler rather than on the menu.

---

## Notes on the schema

It differs from the draft SQL in the deployment plan, deliberately:

- **`users` instead of `sellers`, keyed by Telegram id.** The Telegram user id
  *is* the chat id, so the bot can always reach a seller without a separate
  `telegram_chat_id` column and without a lookup that can go stale.
- **No `CHECK` on `category`.** The bot offers eleven categories and sellers use
  them — honey, meat, seedlings. A five-value constraint would start rejecting
  real listings. The frontend folds anything outside its five chips into a
  *boshqa* bucket, so nothing is dropped.
- **`district` is a slug now, but the column did not change.** Listings posted
  since the district picker hold a key from `districts.py`; older ones hold
  whatever the seller typed — "Urgut", "urgut tumani", "Chorbog'". Both are
  read through `district_label(key, fallback=...)`, so nothing was migrated and
  nothing was lost. A `CHECK` here would reject the project's own history.
- **Integer ids, not UUIDs.** Shorter URLs (`/e/42`), smaller indexes, and the
  bot's callback data has a 64-byte limit that UUIDs eat into.
- **`status` instead of `is_sold_out`.** Room for `expired` and `hidden` later
  without another migration. The API still exposes `is_sold_out` on the public
  REST surface, so the frontend contract is unchanged.

---

*Vositachisiz. 🌿*
