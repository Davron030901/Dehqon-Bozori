-- 0003 — tuman bo'yicha qidiruvni tezlashtirish
-- ---------------------------------------------------------------------------
-- `listings.district` ustuni o'zgarmaydi va o'zgarmasligi kerak: unda ikki xil
-- qiymat yonma-yon yashaydi —
--
--   * yangi e'lonlarda  → `districts.py` dagi slug ("urgut", "samarkand_city")
--   * eski e'lonlarda   → sotuvchi qo'lda yozgan matn ("Urgut", "urgut tumani")
--
-- Eski qatorlarni majburan slug'ga aylantirish vasvasasi bor, lekin bu xato
-- bo'lardi: "Chorbog'" — qishloq nomi, tuman emas, va uni "urgut" ga
-- almashtirish sotuvchi yozgan aniq ma'lumotni yo'q qiladi. Backend ikkalasini
-- ham o'qiy oladi (`district_label(key, fallback=...)`), shuning uchun eski
-- ma'lumot shundayligicha qoladi.
--
--   Dashboard → SQL Editor → New query → shu faylni joylang → Run
-- ---------------------------------------------------------------------------

-- Xaridorning eng ko'p ishlatadigan so'rovi: "Samarqand viloyati, Urgut
-- tumanida kim sotyapti?" — viloyat va tuman birga keladi, shuning uchun
-- ikkalasi bitta indeksda.
create index if not exists idx_listings_region_district
  on listings (region, district);

-- Faol e'lonlar ustidagi bir xil so'rov — bosh sahifa aynan shuni so'raydi.
create index if not exists idx_listings_status_region_district
  on listings (status, region, district);


-- ---------------------------------------------------------------------------
-- Ixtiyoriy: eski qiymatlarni ko'rish
-- ---------------------------------------------------------------------------
-- Qaysi e'lonlar hali erkin matn saqlayotganini bilish uchun. Ularni tuzatish
-- shart emas — sayt ham, bot ham ularni to'g'ri ko'rsatadi.
--
--   select district, count(*)
--   from listings
--   where district is not null
--   group by district
--   order by count(*) desc;
