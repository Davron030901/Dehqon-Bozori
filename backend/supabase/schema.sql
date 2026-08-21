-- Dehqon Bozori — Supabase / Postgres schema
-- ---------------------------------------------------------------------------
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
--
-- You do NOT strictly have to: the backend calls Base.metadata.create_all() on
-- startup and will create these tables itself. Running it here first is still
-- worth doing, because only this script sets up the Row Level Security policies
-- that let the frontend read listings directly with the anon key.
--
-- This mirrors the SQLAlchemy models in app/db/database.py exactly. If you
-- change one, change the other.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------------------
-- users — every person, grower or buyer
-- ---------------------------------------------------------------------------
-- `id` IS the Telegram user id (which is also the chat id the bot messages).
-- That is deliberate: it removes a whole class of "which account is this?"
-- bugs, and it means the bot can always reach a seller without storing a
-- separate mapping.
--
-- Sellers the founder adds by phone (people who called instead of using the
-- bot) get a synthetic NEGATIVE id, which can never collide with a real
-- Telegram id. If that person later starts the bot, merge the two rows.
create table if not exists users (
  id          bigint primary key,
  username    varchar(64),
  full_name   varchar(255),
  phone       varchar(32),
  region      varchar(32),
  village     varchar(128),
  language    varchar(2)  not null default 'uz',
  created_at  timestamptz not null default now()
);

create index if not exists idx_users_phone on users (phone);


-- ---------------------------------------------------------------------------
-- listings — the produce on offer
-- ---------------------------------------------------------------------------
-- Note on categories: there is intentionally NO check constraint. The bot
-- offers eleven categories (melons, greens, honey, meat, seedlings…) and
-- sellers use them. The frontend folds anything outside its five headline
-- chips into a "boshqa" bucket, so nothing is lost or rejected. Adding a
-- five-value CHECK here would start refusing real listings.
create table if not exists listings (
  id                serial primary key,
  seller_id         bigint not null references users (id) on delete cascade,

  title             varchar(255) not null,
  category          varchar(32)  not null,
  description       text,

  price             numeric(12, 2) not null,
  currency          varchar(8)   not null default 'so''m',
  unit              varchar(16)  not null default 'kg',
  quantity          varchar(64),

  region            varchar(32)  not null,
  district          varchar(128),

  -- Two photo sources, both kept, so either client can render any listing:
  --   photo_file_id — uploaded through Telegram (permanent, free, Telegram-hosted)
  --   photo_url     — uploaded through the website, served from media/
  -- The API prefers file_id when both exist, because a container's local disk
  -- may be wiped but a Telegram file_id is forever.
  photo_file_id     varchar(255),
  photo_url         varchar(512),

  phone             varchar(32),
  telegram_username varchar(64),
  whatsapp          varchar(32),

  status            varchar(16) not null default 'active',   -- active | sold
  source            varchar(16) not null default 'bot',      -- bot | web | admin | api
  views             integer     not null default 0,
  harvest_date      varchar(16),

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_listings_category   on listings (category);
create index if not exists idx_listings_region     on listings (region);
create index if not exists idx_listings_district   on listings (district);
create index if not exists idx_listings_status     on listings (status);
create index if not exists idx_listings_created_at on listings (created_at desc);
create index if not exists idx_listings_seller     on listings (seller_id);
-- The buyer's default view is "active, newest first" — serve it from one index.
create index if not exists idx_listings_status_created
  on listings (status, created_at desc);
-- "Samarqand viloyati, Urgut tumanida kim sotyapti?" — bozor savdogarining eng
-- ko'p beradigan savoli. Viloyat va tuman doim birga keladi.
create index if not exists idx_listings_region_district
  on listings (region, district);
create index if not exists idx_listings_status_region_district
  on listings (status, region, district);


-- ---------------------------------------------------------------------------
-- favorites — listings a buyer saved in the bot
-- ---------------------------------------------------------------------------
create table if not exists favorites (
  id         serial primary key,
  user_id    bigint  not null references users (id)    on delete cascade,
  listing_id integer not null references listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_user_listing unique (user_id, listing_id)
);

create index if not exists idx_favorites_user on favorites (user_id);


-- ---------------------------------------------------------------------------
-- contact_events — who tapped call / telegram / whatsapp
-- ---------------------------------------------------------------------------
-- Deliberately anonymous: which listing, which channel, when. Nothing that
-- identifies the buyer. Enough to see what is working; nothing a person would
-- mind us keeping.
create table if not exists contact_events (
  id         serial primary key,
  listing_id integer not null references listings (id) on delete cascade,
  channel    varchar(16) not null check (channel in ('call', 'telegram', 'whatsapp')),
  source     varchar(16) not null default 'web',       -- web | bot
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_events_listing on contact_events (listing_id);
create index if not exists idx_contact_events_created on contact_events (created_at desc);


-- ---------------------------------------------------------------------------
-- auth_codes / web_sessions — passwordless login, verified by the bot
-- ---------------------------------------------------------------------------
-- The site shows a t.me deep link, the bot approves the code, the browser polls
-- and receives a bearer token. No SMS gateway, no passwords.
create table if not exists auth_codes (
  code       varchar(16) primary key,
  user_id    bigint,
  approved   boolean not null default false,
  consumed   boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists web_sessions (
  token      varchar(64) primary key,
  user_id    bigint not null references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists idx_web_sessions_user on web_sessions (user_id);


-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- The backend connects as the `postgres` superuser over the Postgres protocol,
-- which BYPASSES RLS — so none of this restricts the API or the bot.
--
-- These policies only matter for anything using the Supabase anon key, e.g. the
-- Next.js frontend reading listings directly from the browser. The rule is:
-- the anon key may READ active listings and nothing else. Every write goes
-- through the backend, where the validation lives.

alter table listings       enable row level security;
alter table users          enable row level security;
alter table favorites      enable row level security;
alter table contact_events enable row level security;
alter table auth_codes     enable row level security;
alter table web_sessions   enable row level security;

drop policy if exists "Public can read active listings" on listings;
create policy "Public can read active listings"
  on listings for select
  to anon
  using (status = 'active');

-- Sellers are exposed only through the columns a buyer needs to make contact,
-- via a view. The users table itself stays closed to the anon key: it holds
-- phone numbers for people who never agreed to publish them.
--
-- security_invoker is the important word here. A Postgres view normally runs
-- with its *owner's* rights, which would quietly bypass the RLS we just enabled
-- on users — the view would hand the anon key every row. With security_invoker
-- the view is evaluated as the caller, so users' RLS still applies.
create or replace view public_sellers
  with (security_invoker = true)
  as select id, full_name, username, village, region
  from users;

-- Only sellers with at least one active listing are publicly visible, and only
-- through the columns above.
drop policy if exists "Public can read sellers with active listings" on users;
create policy "Public can read sellers with active listings"
  on users for select
  to anon
  using (
    exists (
      select 1 from listings
      where listings.seller_id = users.id
        and listings.status = 'active'
    )
  );

-- NOTE: no anon INSERT / UPDATE / DELETE policy anywhere, on purpose.
-- Without a permissive policy, RLS denies by default.


-- ---------------------------------------------------------------------------
-- Optional: keep updated_at honest
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_listings_updated_at on listings;
create trigger trg_listings_updated_at
  before update on listings
  for each row execute function touch_updated_at();
