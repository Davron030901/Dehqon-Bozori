# Dehqon Bozori 🌿 — Holat hisoboti (4-nashr)

**Sana:** 2026-10-04
**Xulosa:** Loyiha to'rt qismdan iborat va to'rttasi ham **ishga tushirilib,
tekshirildi**: Telegram bot, API, sayt va yangi **mobil ilova** (Android/iOS).
Avvalgi hisobotdagi «kod hech qachon kompilyatordan o'tmagan» degan
ogohlantirish endi o'rinli emas.

---

## ✅ Tekshirilgan — ishga tushirib ko'rildi

| Tekshiruv | Natija |
|---|---|
| `python test_all.py` — 6 ta to'plam | backend 171 · contract 227 · bot 344 · frontend 152 · security 71 · mobile 47 — **hammasi o'tdi** |
| Backend to'plami **haqiqiy Postgres 16** da | 171/171 — CI'da ham alohida job |
| `schema.sql` ↔ modellar (`check_schema_sql.py`) | Har bir jadval va ustun mos; eski bazaga 0002–0005 migratsiyalar ikki martadan qo'llanganda ham |
| `frontend: npm run check` | verify + TypeScript + ESLint + 72 vitest — o'tdi |
| `frontend: npm run build` | Next.js production build — o'tdi (API bilan ham, demo rejimda ham) |
| `mobile: npm run check` | verify + TypeScript + ESLint + 35 vitest — o'tdi |
| `mobile: expo export --platform android` | Metro Android bundle (Hermes) — o'tdi |
| `backend: docker build` | Image yig'ildi, konteyner ishga tushdi, `/health` 200, foydalanuvchi root emas |
| Brauzerda haqiqiy oqimlar (Playwright) | Filtrlar → URL, «Yana ko'rsatish», ♡, shikoyat, sotuvchi sahifasi, rasm bilan e'lon qo'shish, tahrirlash, kabinet, admin shikoyatlar — sayt ham, ilova ham |
| Tuzatishlardan keyin yana brauzerda | sayt 17/17 · ilova 10/10: raqamli kirish va rad etish, «8 000» narx, miqdor tahriri va birlik almashuvi, +998 havola, chiqishda sevimlilar, tez filtrlar, shikoyat izohi |

---

## 🔴 Topilgan va tuzatilgan xatolar

Bular kodni o'qish bilan emas, **ishga tushirib** topildi:

| Xato | Oqibati | Tuzatish |
|---|---|---|
| Sayt faqat birinchi 100 ta e'lonni yuklab, brauzerda filtrlardi | 101-e'lon hech qachon ko'rinmasdi | Filtrlash va sahifalash endi bazada; filtrlar URL'da |
| Har bir tashrif e'lonni **2 marta** ko'rilgan deb sanardi | Sotuvchi statistikasi ikki baravar yolg'on | `react.cache` — bitta so'rov |
| Bosh sahifani ochishning o'zi 24 ta e'longa «ko'rish» qo'shardi (Link prefetch) | «Ko'p ko'rilgan» saralash va sotuvchi raqamlari buzilgan; xaridorning 3G trafigi behuda | Prefetch o'chirildi + verify qoidasi |
| Bosh sahifada React hydration xatosi | `localeCompare('uz')` Node va Chrome'da turlicha saralaydi | Qat'iy tartib + verify qoidasi |
| Saytdan yuklangan rasmning Telegram nusxasi (`photo_file_id`) e'longa yozilmasdi | Render qayta ishga tushganda rasm yo'qolardi | Endi yoziladi |
| Sayt faqat 5 kategoriya va faqat «kg» bilan ishlardi | Asal litrda, tuxum donada sotilmasdi; asal «Boshqa» bo'lib qolardi | Botdagi 11 kategoriya va 7 birlik |
| «Qo'ng'iroq» tugmasini sikl bilan bosish sotuvchining Telegram'ini to'ldirib yuborardi | Spam vositasi | Bir xaridor/e'lon uchun 10 daqiqada 1 xabar; rate-limit |
| Nomida `<` bo'lgan e'lon uchun Telegram xabari yetib bormasdi | Sotuvchi xaridordan bexabar | HTML escape |
| Saytdan chiqish ilovadan ham chiqarib yuborardi | Barcha sessiyalar o'chirilardi | Faqat joriy qurilma |
| Botdagi «Saytni ochish» API'ning JSON sahifasini ochardi | Sayt o'rniga texnik matn | `SITE_URL` sozlamasi |
| Admin dehqon qo'shganda qishloq o'rniga tuman slug'i yozilardi («urgut») | Sotuvchi kartasida xom slug | Nomi yoziladi |
| `POST /listings` sotuvchini o'z qoidasi bilan yaratardi | README'dagi «uchala yo'l bitta qoida» gapi yolg'on edi | Umumiy `get_or_create_offline_seller()` |
| `90 123 45 67` → `+901234567` | Bir dehqon ikki marta yaratilishi mumkin edi | 9 raqamli raqamga `+998` qo'shiladi |
| E'lon qo'shish sahifasi «qishloq»ni majburiy so'rardi, lekin serverga yubormasdi | Kiritilgan ma'lumot yo'qolardi | Maydon olib tashlandi |
| 175-tuman — Qashqadaryodagi **Ko'kdala** yo'q edi (174 ta edi) | O'sha tuman dehqoni e'lon bera olmasdi | Qo'shildi |
| Dockerfile `apt-get` ga bog'liq edi | Kerak bo'lmagan kompilyator va curl | Faqat wheel'lar, Python healthcheck |
| Sotuvchi `photo_url` ga istalgan begona manzilni yoza olardi | Sayt rasm optimizatori noma'lum hostni rad etib, e'lon sahifasi yiqilardi | Faqat o'zimiz yuklagan `/media/uploads/...` qabul qilinadi |
| Ikki test noto'g'ri edi (NBSP narx formati; arxivlangan sahifalar) | CI qizil edi | Haqiqiy xatti-harakatga moslandi |
| README oxirida UTF-16 «axlat» (NUL baytlar) bor edi | GitHub'da buzuq ko'rinardi | Tozalandi |

---

## 🔍 4-nashr: mustaqil ko'rib chiqish topgan xatolar

Butun kod besh yo'nalishda (API, bot va baza, sayt, ilova, ular orasidagi
bog'lanish) alohida-alohida ko'rib chiqildi; har bir topilma qayta
ishga tushirib tasdiqlandi. Hammasi tuzatildi va testga qo'shildi:

| Xato | Oqibati | Tuzatish |
|---|---|---|
| Postgres'da bitta muvaffaqiyatsiz `ALTER` butun ishga tushish tranzaksiyasini bekor qilardi | Backend yangi `reports` jadvalini **hech qachon yaratmasdi** — admin panel 500 berardi | Har qadam o'z tranzaksiyasida; faqat haqiqatan yetishmagan ustun qo'shiladi |
| Telegram orqali kirish havolasini **birovga yuborib**, uning hisobini olish mumkin edi | Fishing: «shu havolani bosing» — va sotuvchi hisobi begonada | Sayt/ilova ikki xonali raqam ko'rsatadi, bot uchta raqamdan shunisini so'raydi; noto'g'ri tanlov kodni yoqib yuboradi |
| Rate-limit `X-Forwarded-For` ning chap (mijoz yozgan) qismini o'qirdi | Har qanday cheklovni soxta sarlavha bilan aylanib o'tish mumkin edi | O'ngdan `TRUSTED_PROXY_HOPS` qadam; xotira chegarasi |
| `90 123 45 67` saytda `tel:+901234567` bo'lardi | «Qo'ng'iroq» **Turkiyaga** qo'ng'iroq qilardi; dehqon ikki marta yaratilardi | Telefon saqlanishda `+998…`; eski yozuvlar ishga tushganda va `0005` da yangilanadi |
| E'lonni tahrirlash miqdorni qayta yozardi | «3 tonna» → «3 kg», «ko'p» → o'chib ketardi | Miqdor — erkin matn, bot kabi; tegilmasa yuborilmaydi |
| «15.000» / «15,000» narxi ilovada 15 so'm bo'lardi | Narx ming baravar arzon | Bot qoidasi: ajratkichlar olib tashlanadi |
| Telegram @username'i yo'q sotuvchi saytda e'lon joylay olmasdi | Tugma bosilardi, hech narsa bo'lmasdi | Bo'sh profil maydonlari formani buzmaydi |
| Bosh sahifada ketma-ket ikki filtr bosilsa, birinchisi yo'qolardi; «Yana ko'rsatish» xato bo'lsa bir sahifani tashlab ketardi | Xaridor noto'g'ri ro'yxatni ko'rardi | Navigatsiya kutilayotgan filtrlarni eslaydi; sahifa raqami faqat muvaffaqiyatda oshadi |
| Chiqishda sevimlilar qurilmada qolardi | Keyingi kirgan odam hisobiga qo'shilib ketardi | Chiqishda tozalanadi; muvaffaqiyatsiz birlashtirish keyingi safar qayta uriniladi |
| Ko'rishlar soni «o'qi-yoz» bilan oshirilardi | Bir vaqtdagi ko'rishlar yo'qolardi | Atomik `views = views + 1` |
| Juda katta id Postgres'da 500 berardi; bo'sh joyli sarlavha o'tib ketardi | Xato sahifa, bo'sh kartochka | Chegaralar va tozalash validatsiyadan oldin |
| Rasm almashtirilsa ham manzil o'zgarmasdi (7 kunlik kesh) | Xaridorlar eski rasmni ko'rardi | Manzilga rasm versiyasi qo'shildi |
| «Bugun» belgisi server soati (UTC) bo'yicha hisoblanardi | 00:00–05:00 orasida hydration xatosi | Toshkent vaqti, backend bilan bir xil |
| Ilovada `/auth/me` bir marta xato bersa, sessiya qayta tekshirilmasdi | Kirgan odam o'zini chiqib ketgan deb ko'rardi | 10 soniyada va ilovaga qaytganda qayta urinish |
| iPhone'da shikoyat oynasi klaviatura ostida qolardi | Izohni yozib, yuborib bo'lmasdi | Klaviaturadan yuqoriga ko'tariladi, kichik ekranda aylantiriladi |

**Tuzatishlarning o'zi ham qayta tekshirildi.** Ikkinchi mustaqil ko'rib chiqish
13 ta kamchilik topdi, hammasi tuzatildi. Eng muhimlari:

- Ilova Telegram'ni darhol ochib, raqamni ko'rsatmay qo'yardi — sotuvchi
  taxmin qilishga majbur edi. Endi avval raqam, keyin «Telegram'ni ochish»
  tugmasi (sayt, ilova va eski PWA'da bir xil).
- 32 xonali «telefon» `+` bilan ustunga sig'masdi va Postgres'da **backend
  ishga tushmay qolardi**. Endi 7–15 raqamdan tashqarisi 422; eski
  yozuvlar tegilmaydi va ishga tushishni to'xtatmaydi.
- Arab va keng (full-width) raqamlar oddiy raqamga o'giriladi; SQL migratsiya
  ularga tegmaydi.
- Birlik o'zgarsa, sayt yozgan «500 kg» → «500 litr» bo'ladi.
- Docker'da sinab ko'rilganda topildi: API va bot bir jarayonda bir vaqtda
  bazani yaratardi, **bo'sh bazada** konteyner birinchi deploy'dayoq
  «table already exists» bilan yiqilardi. Endi navbat bilan; test to'plami
  ham aynan shunday ishga tushadi.
- Sessiya muddati tugagan qurilmada sevimlilar keyingi akkauntga
  qo'shilmaydi (sayt va ilova).

---

## 🆕 Qo'shilgan imkoniyatlar

**API (sayt va ilova uchun umumiy):** sevimlilar (botdagi ⭐ bilan bitta
jadval), e'lonni to'liq tahrirlash, sotuvchining ochiq sahifasi, filtr
hisoblagichlari (`/api/facets`), o'xshash e'lonlar, xaridor shikoyatlari va
admin navbati, sotuvchiga «nechta xaridor bog'landi» soni, `/api/meta` da
tumanlar.

**Sayt:** URL'dagi filtrlar, «Yana ko'rsatish», saqlanganlar sahifasi,
tahrirlash, sotuvchi sahifasi, ulashish, shikoyat, kabinetda chiqish va
profil, admin shikoyatlar bo'limi, `sitemap.xml` va `robots.txt`.

**Mobil ilova (`mobile/`):** to'liq yangi — [mobile/README.md](mobile/README.md).
O'zbek va rus tillari, Telegram orqali kirish, kameradan rasm bilan e'lon,
kabinet, admin panel, APK yig'ish profili.

**Bot:** sayt/ilova havolalari, Android ilova tugmasi, ko'rish va bog'lanishlar
endi botda ham sanaladi.

---

## ⚠️ Ochiq qolgan masalalar

- **Ishlab turgan Supabase bazasi** uchun `0004` va `0005` migratsiyalarini
  bir marta ishga tushiring (`NAVBATDAGI-ISH.md`, 2-bo'lim).

- **Push-bildirishnomalar** ilovada yo'q — ataylab: sotuvchi xabarni Telegram'da
  oladi. Kerak bo'lsa, keyingi bosqich.
- **iOS** uchun kod tayyor, lekin App Store'ga chiqarish Apple Developer
  akkaunti ($99/yil) va `eas build -p ios` ni talab qiladi.
- Ilova faqat brauzer (react-native-web) va Metro bundle orqali tekshirildi;
  **haqiqiy telefonda** kamera va Telegram'ga o'tishni bir marta sinab ko'ring
  (`NAVBATDAGI-ISH.md` dagi ro'yxat).

---

*Vositachisiz. 🌿*
