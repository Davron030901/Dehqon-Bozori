-- Dehqon Bozori — boshlang'ich namuna ma'lumotlari
-- ---------------------------------------------------------------------------
-- Yangi Supabase loyihasi bo'sh bo'ladi, bo'sh sayt esa buzuq ko'rinadi. Bu
-- fayl 6 ta sotuvchi, 12 ta e'lon va bir nechta bog'lanish hodisasini qo'shadi —
-- birinchi deploy'ni ko'rish, filtrlarni va admin paneldagi grafiklarni sinash
-- uchun yetarli.
--
--   Dashboard → SQL Editor → New query → shu faylni joylang → Run
--   (avval schema.sql ishlatilgan bo'lishi kerak)
--
-- Qayta-qayta ishlatsa bo'ladi: har bir blok "allaqachon bormi?" deb tekshiradi,
-- shuning uchun ikkinchi marta ishga tushirilsa nusxa yaratmaydi.
--
-- ⚠️ HAQIQIY SOTUVCHILAR KELGANDA O'CHIRING — pastda tozalash so'rovi bor.
--
-- Sotuvchi id'lari MANFIY: bu "offline" sotuvchi, ya'ni telefon qilib, o'zi
-- botga kirmagan dehqon. Manfiy id hech qachon haqiqiy Telegram id bilan
-- to'qnashmaydi. Namuna ma'lumotlari -9001 dan -9999 gacha bo'lgan oraliqni
-- egallaydi, shunda oddiy -1, -2 … qatoridan ajralib turadi va tozalash oson.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Sotuvchilar
-- ---------------------------------------------------------------------------
insert into users (id, full_name, phone, region, village, language) values
  (-9001, 'Ali Rahimov',       '+998901112233', 'samarkand', 'Chorbog''',  'uz'),
  (-9002, 'Zulfiya Karimova',  '+998902223344', 'samarkand', 'Urgut',      'uz'),
  (-9003, 'Bahodir To''rayev', '+998903334455', 'samarkand', 'Jomboy',     'uz'),
  (-9004, 'Nodira Ergasheva',  '+998904445566', 'bukhara',   'G''ijduvon', 'uz'),
  (-9005, 'Sherzod Qodirov',   '+998905556677', 'fergana',   'Quva',       'uz'),
  (-9006, 'Malika Yusupova',   '+998906667788', 'samarkand', 'Payariq',    'uz')
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- 2. E'lonlar
-- ---------------------------------------------------------------------------
-- `age_days` — e'lon necha kun oldin joylangani. 0 bo'lsa "Bugun joylandi"
-- nishoni chiqadi, ya'ni bu ustun saytdagi nishonni ham, "Eng yangi"
-- saralashni ham bir vaqtda sinaydi.
--
-- `listings.id` serial bo'lgani uchun `on conflict` bu yerda hech narsani
-- ushlamaydi — shuning uchun `where not exists` bilan himoyalangan.
insert into listings
  (seller_id, title, category, description, price, unit, quantity,
   region, district, phone, status, source, views, created_at)
select
  v.seller_id, v.title, v.category, v.description, v.price, v.unit, v.quantity,
  v.region, v.district, v.phone, v.status, 'admin', v.views,
  now() - (v.age_days || ' days')::interval
from (values
  -- seller, nomi, kategoriya, izoh, narx, birlik, miqdor, hudud, tuman, telefon, holat, ko'rishlar, necha kun oldin
  (-9001, 'Yangi pomidor', 'vegetables',
   'Bugun uzilgan, issiqxona pomidori. Qadoqlangan.',
   8000::numeric, 'kg', '500 kg', 'samarkand', 'Urgut', '+998901112233', 'active', 42, 0),

  (-9002, 'Qora uzum', 'fruits',
   'Husayni navi. Bog''dan to''g''ridan-to''g''ri.',
   15000, 'kg', '300 kg', 'samarkand', 'Urgut', '+998902223344', 'active', 31, 0),

  (-9006, 'Sog''in sut', 'dairy',
   'Har kuni ertalab sog''iladi.',
   9000, 'liter', '40 litr', 'samarkand', 'Payariq', '+998906667788', 'active', 12, 0),

  (-9003, 'Bodring', 'vegetables',
   'Yer bodringi, achchiq emas.',
   7000, 'kg', '250 kg', 'samarkand', 'Jomboy', '+998903334455', 'active', 27, 2),

  (-9001, 'Kartoshka', 'vegetables',
   'Sarson navi, saqlashga yaxshi.',
   5500, 'kg', '2 tonna', 'samarkand', 'Chorbog''', '+998901112233', 'active', 55, 3),

  (-9004, 'Bug''doy', 'grains',
   'Toza, quruq, elakdan o''tkazilgan.',
   4200, 'kg', '5 tonna', 'bukhara', 'G''ijduvon', '+998904445566', 'active', 18, 4),

  (-9005, 'Olma', 'fruits',
   'Golden navi, yangi uzilgan.',
   11000, 'kg', '800 kg', 'fergana', 'Quva', '+998905556677', 'active', 64, 5),

  (-9002, 'Mayiz', 'dried',
   'Sabza mayiz, quyoshda quritilgan.',
   35000, 'kg', '120 kg', 'samarkand', 'Urgut', '+998902223344', 'active', 22, 6),

  (-9006, 'Tog'' asali', 'honey',
   'Chinakam tog'' asali, shu yilgi hosil.',
   90000, 'liter', '60 litr', 'samarkand', 'Payariq', '+998906667788', 'active', 88, 9),

  (-9003, 'Sabzi', 'vegetables',
   'Yirik, tekis sabzi.',
   6000, 'kg', '600 kg', 'samarkand', 'Jomboy', '+998903334455', 'active', 15, 11),

  (-9004, 'Yong''oq', 'dried',
   'Po''chog''i yupqa, ichi to''liq.',
   75000, 'kg', '200 kg', 'bukhara', 'G''ijduvon', '+998904445566', 'active', 47, 13),

  -- Sotilgan — "Sotilgan" nishoni va filtri shu e'lon ustida sinaladi
  (-9005, 'Qovun', 'melons',
   'Mirzacho''l qovuni. Tugadi.',
   13000, 'kg', '400 kg', 'fergana', 'Quva', '+998905556677', 'sold', 103, 16)
) as v(seller_id, title, category, description, price, unit, quantity,
       region, district, phone, status, views, age_days)
where not exists (
  select 1 from listings where seller_id between -9999 and -9001
);


-- ---------------------------------------------------------------------------
-- 3. Bog'lanish hodisalari
-- ---------------------------------------------------------------------------
-- Admin paneldagi "aloqa kanali bo'yicha" grafigi bo'sh turmasligi uchun.
-- Atayin anonim: qaysi e'lon, qaysi kanal, qachon — xaridor haqida hech narsa.
insert into contact_events (listing_id, channel, source, created_at)
select l.id, c.channel, 'web', now() - (c.age_days || ' days')::interval
from listings l
cross join (values
  ('call',     1),
  ('telegram', 2),
  ('call',     3),
  ('whatsapp', 5)
) as c(channel, age_days)
where l.seller_id between -9999 and -9001
  and l.status = 'active'
  and l.views > 40
  and not exists (
    select 1
    from contact_events e
    join listings x on x.id = e.listing_id
    where x.seller_id between -9999 and -9001
  );


-- ---------------------------------------------------------------------------
-- Tozalash — haqiqiy sotuvchilar kelganda shuni ishlating
-- ---------------------------------------------------------------------------
-- E'lonlar va bog'lanish hodisalari `on delete cascade` orqali o'zi o'chadi,
-- shuning uchun bitta qator yetarli:
--
--   delete from users where id between -9999 and -9001;
