# Dehqon Bozori 🌿 — Holat hisoboti (3-nashr)

**Sana:** 2026-10-03
**Xulosa:** Loyiha to'rt qismdan iborat va to'rttasi ham **ishga tushirilib,
tekshirildi**: Telegram bot, API, sayt va yangi **mobil ilova** (Android/iOS).
Avvalgi hisobotdagi «kod hech qachon kompilyatordan o'tmagan» degan
ogohlantirish endi o'rinli emas.

---

## ✅ Tekshirilgan — ishga tushirib ko'rildi

| Tekshiruv | Natija |
|---|---|
| `python test_all.py` — 6 ta to'plam | backend 143 · contract 227 · bot 344 · frontend 152 · security 71 · mobile 47 — **hammasi o'tdi** |
| `frontend: npm run check` | verify + TypeScript + ESLint + 65 vitest — o'tdi |
| `frontend: npm run build` | Next.js production build — o'tdi (API bilan ham, demo rejimda ham) |
| `mobile: npm run check` | verify + TypeScript + ESLint + 28 vitest — o'tdi |
| `mobile: expo export --platform android` | Metro Android bundle (Hermes) — o'tdi |
| `backend: docker build` | Image yig'ildi, konteyner ishga tushdi, `/health` 200, foydalanuvchi root emas |
| Brauzerda haqiqiy oqimlar (Playwright) | Filtrlar → URL, «Yana ko'rsatish», ♡, shikoyat, sotuvchi sahifasi, rasm bilan e'lon qo'shish, tahrirlash, kabinet, admin shikoyatlar — sayt ham, ilova ham |

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

- **Push-bildirishnomalar** ilovada yo'q — ataylab: sotuvchi xabarni Telegram'da
  oladi. Kerak bo'lsa, keyingi bosqich.
- **iOS** uchun kod tayyor, lekin App Store'ga chiqarish Apple Developer
  akkaunti ($99/yil) va `eas build -p ios` ni talab qiladi.
- Ilova faqat brauzer (react-native-web) va Metro bundle orqali tekshirildi;
  **haqiqiy telefonda** kamera va Telegram'ga o'tishni bir marta sinab ko'ring
  (`NAVBATDAGI-ISH.md` dagi ro'yxat).

---

*Vositachisiz. 🌿*
