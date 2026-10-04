-- 0004 — shikoyatlar (reports)
-- ---------------------------------------------------------------------------
-- Xaridor e'lonni "spam", "firibgarlik", "narx noto'g'ri" yoki "allaqachon
-- sotilgan" deb belgilashi mumkin. Adminlarga darhol Telegram xabari ketadi,
-- shikoyat esa admin panelda ko'rib chiqilguncha turadi.
--
-- Backend bu jadvalni o'zi ham yaratadi (create_all), lekin RLS faqat shu
-- skript orqali yoqiladi — anon kalit bu jadvalga umuman tegolmasligi kerak.
-- Shuning uchun ishlab turgan bazada bu skriptni bir marta ishga tushirish
-- MAJBURIY.
--
--   Dashboard → SQL Editor → New query → shu faylni joylang → Run
-- ---------------------------------------------------------------------------

create table if not exists reports (
  id          serial primary key,
  listing_id  integer not null references listings (id) on delete cascade,
  reporter_id bigint,
  reason      varchar(16) not null
              check (reason in ('spam', 'fraud', 'wrong_price', 'sold', 'other')),
  note        varchar(500),
  status      varchar(16) not null default 'open',     -- open | resolved
  created_at  timestamptz not null default now()
);

create index if not exists idx_reports_listing on reports (listing_id);
create index if not exists idx_reports_status  on reports (status);

-- Hech qanday anon siyosat yo'q: RLS yoqilgan va ruxsat beruvchi siyosat
-- bo'lmasa, Postgres hamma narsani rad etadi. Faqat backend (postgres roli,
-- RLS'ni chetlab o'tadi) yoza va o'qiy oladi.
alter table reports enable row level security;
