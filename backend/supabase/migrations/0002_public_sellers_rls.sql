-- 0002 — public_sellers ko'rinishidagi RLS teshigini yopish
-- ---------------------------------------------------------------------------
-- Muammo: Postgres'da oddiy VIEW o'z EGASI huquqi bilan ishlaydi, chaquvchi
-- huquqi bilan emas. Ya'ni `public_sellers` ko'rinishi `users` jadvalidagi RLS
-- ni chetlab o'tar va anon kalitiga BARCHA sotuvchilarni qaytarardi — hatto
-- birorta ham faol e'loni yo'q, ya'ni hech narsa e'lon qilishga rozilik
-- bermagan odamlarni ham.
--
-- Yechim ikki qismdan iborat:
--   1. `security_invoker = true` — ko'rinish endi chaqiruvchi nomidan
--      baholanadi, demak `users` dagi RLS yana kuchga kiradi.
--   2. `users` uchun aniq SELECT siyosati — faqat kamida bitta FAOL e'loni bor
--      sotuvchi ko'rinadi.
--
-- Faqat allaqachon ishlab turgan baza uchun kerak. Yangi loyihada schema.sql
-- buni o'zi qiladi.
--
--   Dashboard → SQL Editor → New query → shu faylni joylang → Run
--
-- ⚠️ security_invoker Postgres 15+ da bor. Supabase 15 dan yuqorisini beradi,
--    lekin eski loyihada versiyani tekshiring: select version();
-- ---------------------------------------------------------------------------

create or replace view public_sellers
  with (security_invoker = true)
  as select id, full_name, username, village, region
  from users;

alter table users enable row level security;

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

-- Tekshirish: bu so'rov faqat faol e'loni bor sotuvchilarni qaytarishi kerak.
--
--   set role anon;
--   select count(*) from public_sellers;
--   reset role;
