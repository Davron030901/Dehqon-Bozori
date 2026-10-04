-- 0005 — kirishni tasdiqlash raqami va telefonlarni bir xil shaklga keltirish
-- ---------------------------------------------------------------------------
-- 1. `auth_codes.match_code` — sayt/ilova ko'rsatadigan ikki xonali raqam. Bot
--    sotuvchidan shu raqamni tanlashni so'raydi, shuning uchun birov yuborgan
--    kirish havolasini ko'r-ko'rona tasdiqlab, o'z hisobini begonaga berib
--    qo'yib bo'lmaydi.
--
-- 2. Telefonlar '+998…' shakliga. '90 123 45 67' deb yozilgan raqam ilgari
--    '+901234567' (Turkiya!) bo'lib saqlanardi: saytdagi «Qo'ng'iroq» tugmasi
--    boshqa davlatga qo'ng'iroq qilardi, admin o'sha dehqonni qayta kiritganda
--    esa ikkinchi sotuvchi yaratilardi.
--
-- Backend ikkalasini ham ishga tushganda o'zi bajaradi (yetishmagan ustunni
-- qo'shadi, eski telefonlarni yangilaydi), shuning uchun bu skript — kafolat:
-- backend yangilanishidan oldin ishga tushirsangiz, birinchi so'rovdanoq hammasi
-- joyida bo'ladi. Qayta ishga tushirish xavfsiz.
--
--   Dashboard → SQL Editor → New query → shu faylni joylang → Run
-- ---------------------------------------------------------------------------

alter table auth_codes add column if not exists match_code varchar(4);

-- To'qqiz raqam = kod-siz yozilgan O'zbekiston mobil raqami (backend'dagi
-- normalize_phone qoidasi). '+901234567' va '90 123 45 67' -> '+998901234567'.
-- Boshqa shakllar ('998901234567', '+998 90 123-45-67') faqat raqamlari qoladi.
--
-- Tegilmaydiganlar — backend ham ularni o'zgartirmaydi yoki o'zi hal qiladi:
--   * 15 tadan ko'p raqam — telefon raqami emas (E.164), '+' bilan ustunga
--     sig'masligi ham mumkin edi;
--   * lotin bo'lmagan raqamlar ('٩٠ ١٢٣…') — SQL ularni raqam deb bilmaydi,
--     backend esa to'g'ri o'giradi.
update users
   set phone = case
     when length(regexp_replace(phone, '\D', '', 'g')) = 9
       then '+998' || regexp_replace(phone, '\D', '', 'g')
     else '+' || regexp_replace(phone, '\D', '', 'g')
   end
 where phone is not null
   and phone !~ '[^[:ascii:]]'
   and length(regexp_replace(phone, '\D', '', 'g')) between 1 and 15
   and phone !~ '^\+[0-9]{10,}$';

update listings
   set phone = case
     when length(regexp_replace(phone, '\D', '', 'g')) = 9
       then '+998' || regexp_replace(phone, '\D', '', 'g')
     else '+' || regexp_replace(phone, '\D', '', 'g')
   end
 where phone is not null
   and phone !~ '[^[:ascii:]]'
   and length(regexp_replace(phone, '\D', '', 'g')) between 1 and 15
   and phone !~ '^\+[0-9]{10,}$';

update listings
   set whatsapp = case
     when length(regexp_replace(whatsapp, '\D', '', 'g')) = 9
       then '+998' || regexp_replace(whatsapp, '\D', '', 'g')
     else '+' || regexp_replace(whatsapp, '\D', '', 'g')
   end
 where whatsapp is not null
   and whatsapp !~ '[^[:ascii:]]'
   and length(regexp_replace(whatsapp, '\D', '', 'g')) between 1 and 15
   and whatsapp !~ '^\+[0-9]{10,}$';
