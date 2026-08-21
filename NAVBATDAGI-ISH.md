# Navbatdagi ish — yangi sessiya uchun topshiriq

**Yozilgan:** 2026-07-28
**Sabab:** Linux sandbox ishdan chiqdi, testlarni ishga tushirib bo'lmadi.
Yangi sessiyada sandbox tiklanadi va hamma narsani tekshirish mumkin bo'ladi.

---

## Yangi sessiyada birinchi xabar

Quyidagini nusxalab yuboring:

> Dehqon Bozori loyihasini davom ettir. Avval `NAVBATDAGI-ISH.md` va
> `HOLAT-HISOBOTI.md` ni o'qi. Keyin: `pip install -r backend/requirements.txt`,
> `npm install` (frontend), so'ng `python test_all.py` va `npm run check` ni
> ishga tushirib, chiqqan hamma xatoni tuzat. Undan keyin shu hujjatdagi
> "Bajarilmagan ish" bo'limini bosqichma-bosqich bajar va har bosqichdan keyin
> testlarni qayta ishga tushir.

---

## Qabul qilingan qarorlar

| Savol | Qaror |
|---|---|
| Asosiy frontend | Next.js (`frontend/`). `backend/web/` arxivlangan |
| Real-time | Sahifa har **30 soniyada** o'zi yangilanadi (polling). Websocket **emas** — qishloq 3G'da uziladi |
| Tuman tanlash | Botda ham, saytda ham: viloyat → tuman ro'yxati (dropdown/tugma). Erkin matn emas |
| Xaridor filtri | Viloyat **va** tuman bo'yicha |
| Shaharlar | Tumanlar bilan bir ro'yxatda (Samarqand shahri, Qarshi shahri...) |

---

## ✅ Tayyor: tuman ma'lumotlari

`backend/app/districts.py` **allaqachon yozilgan** — qayta qidirmang.

- 14 viloyat, **175 tuman**, ~25 shahar
- Manba: O'zbekiston Davlat statistika qo'mitasi SOATO/MHOBT klassifikatori
  (Vikipediya orqali, 2026-yil holati)
- Har bir yozuv: `{key, uz, type}`, `type` = `"city"` yoki `"district"`
- Shaharlar ro'yxat boshida — dehqon eng yaqin shahar bozorini birinchi qidiradi
- Yordamchi funksiyalar: `districts_of()`, `district_label()`,
  `is_valid_district()`, `DISTRICT_TO_REGION`

**Tekshirish kerak:** Vikipediya 175 ta deydi, fayldagi tumanlar soni 174 ta
chiqdi. Bitta yangi tuman yetishmayotgan bo'lishi mumkin. Birinchi ish sifatida
`district_count()` ni chop eting va `data.gov.uz` bilan solishtiring.

**Til:** joy nomlari faqat o'zbekcha. 175 ta nomni taxminan ruschaga tarjima
qilish — noto'g'ri nom ko'rsatishdan boshqa narsa emas. Bu ataylab shunday.

---

## ✅ 2026-07-28 (kechqurun) — hammasi yozildi

Quyidagilar **bajarildi**, lekin sandbox ishlamagani uchun **ishga
tushirilmagan**:

| Ish | Fayllar |
|---|---|
| Emoji birlashtirildi | `strings.ts` (🥕 🥜 📦), `ProductCard` API emojisini oladi, `verify.mjs` ga qoida |
| Tumanlar — backend | `serializers.py`, `schemas.py`, `routes_listings.py`, `routes_seller.py`, `queries.py`, `0003_districts.sql` |
| Tumanlar — bot | `keyboards.py` (`districts_kb`), `add_listing.py`, `admin.py`, `texts.py` (uz+ru) |
| Tumanlar — sayt | `gen-districts.mjs`, `districts.ts`, uchala forma, `FilterBar`, `HomeFeed` |
| Real-time | `AutoRefresh.tsx` — 30 s, yashirin tab va offline'da to'xtaydi |
| Testlar | `test_bot.py`, `test_contract.py`, `test_frontend.py`, `districts.test.ts`, `api.test.ts` |

Endi quyidagi "Bajarilmagan ish" bo'limining **1-bandi** eng muhimi: hech narsa
kompilyatordan o'tmagan, jami ~3500 qator tekshirilmagan kod bor.

---

## 🔴 Bajarilmagan ish

### 1. Avval: mavjud kodni ishga tushiring

O'tgan sessiyada ~1500 qator kod yozildi va **hech biri kompilyatordan
o'tmagan**. Yangi funksiya qo'shishdan oldin shuni tuzating:

```bash
cd backend && pip install -r requirements.txt
cd ../frontend && npm install
cd .. && python test_all.py
cd frontend && npm run check
```

Ehtimoli yuqori xatolar:

- `tests/test_bot.py` endi 7 ta router kutadi (`admin_router` qo'shilgan)
- `frontend/tests/*.test.ts` — Vitest birinchi marta ishlayapti
- `frontend/app/sotuvchi/admin/page.tsx` — ~700 qator, TypeScript tekshirilmagan
- `backend/app/bot/handlers/admin.py` — ~500 qator, import qilinmagan

### 2. Emoji nomuvofiqligi — aniq xato

Bir xil e'lon botda va saytda **turli emoji** bilan chiqadi:

| Kategoriya | Bot (`catalog.py`) | Sayt (`strings.ts`) |
|---|---|---|
| Sabzavotlar | 🥕 | 🥬 |
| Quruq meva/yong'oq | 🥜 | 🌰 |
| Boshqa | 📦 | 🧺 |

API allaqachon `category_emoji` maydonini qaytaradi (`serializers.py`), lekin
frontend uni ishlatmay, o'zining `categoryLabels` xaritasidan oladi.

**Yechim:**

1. `strings.ts` dagi emojilarni `catalog.py` ga moslang (bitta manba)
2. `ProductCard` va detal sahifasi API'dan kelgan `category_emoji` ni
   ishlatsin, `categoryLabels` faqat demo ma'lumot uchun zaxira bo'lsin
3. `frontend/scripts/verify.mjs` ga yangi qoida: `strings.ts` va `catalog.py`
   emojilari bir xilmi

### 3. Tumanlarni tizimga ulash

**Bazaga.** `listings.district` hozir erkin matn (`VARCHAR(128)`). Slug saqlash
kerak, lekin eski qatorlarni yo'qotmasdan:

- `district` ustunini o'zgartirmang — endi u slug saqlaydi
- Eski erkin matnli qiymatlar `district_label(key, fallback=district)` orqali
  ko'rsatiladi (funksiya allaqachon tayyor)
- `supabase/migrations/0003_districts.sql` — indeks: `create index on
  listings (region, district)`

**Botga** (`app/bot/handlers/add_listing.py` va `admin.py`):

- Viloyat tanlangach, `districts_of(region)` dan inline tugmalar
- `adjust(2)` — Toshkent viloyatida 22 ta yozuv bor, 2 ustun qulay
- Callback prefiksi: `dist:` (bor prefikslar bilan to'qnashmasin —
  `cat: unit: reg: acat: aunit: areg: view: myview: adminview:` band)
- `CreateListing.district` va `AdminListing.district` state'lari bor,
  faqat matn o'rniga callback qabul qilsin

**Saytga:**

- `frontend/lib/districts.ts` — `districts.py` ning ko'chirmasi.
  ⚠️ Qo'lda ko'chirmang: `verify.mjs` ga qoida qo'shing yoki generator yozing,
  aks holda ikkalasi ajralib ketadi
- `elon-qoshish` va `sotuvchi/admin` formalarida: viloyat select o'zgarganda
  tuman select to'ladi
- `FilterBar.tsx` — xaridor uchun tuman filtri
- `lib/api.ts` `applyFilters()` ga `district` qo'shing

**API'ga** (`routes_listings.py`): `district` query parametri.

### 4. Real-time (30 soniyalik polling)

`app/page.tsx` server komponenti (`force-dynamic`). Yangilash uchun kichik
klient komponent:

```tsx
// components/AutoRefresh.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    // Ko'rinmayotgan tabni yangilash — bekorga sarflangan trafik.
    const tick = () => { if (!document.hidden) router.refresh(); };
    const id = setInterval(tick, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
```

`app/page.tsx` ga `<AutoRefresh />` qo'shing. `router.refresh()` server
komponentni qayta ishlatadi va yangi HTML oqib keladi — holat yo'qolmaydi,
xaridor yozayotgan qidiruv matni joyida qoladi.

⚠️ `verify.mjs` dagi "hooks ishlatgan faylda 'use client' bor" qoidasi buni
tekshiradi — direktivani unutmang.

### 5. Testlar

Har bosqichdan keyin `python test_all.py` va `npm run check`.

Yangi test qo'shish kerak:

- `tests/test_bot.py`: har bir viloyatda kamida 1 ta tuman bor;
  `DISTRICT_TO_REGION` to'liq; tuman kalitlari takrorlanmaydi
- `tests/test_contract.py`: frontend va backend tuman slug'lari bir xil
  (hudud slug'lari uchun shunday tekshiruv allaqachon bor — nusxa oling)
- `frontend/tests/`: `applyFilters` tuman bo'yicha filtrlaydi
- `verify.mjs`: emoji mosligi + tuman ro'yxati mosligi

---

## Eslatma: `.env` da hali ikkita `TODO_`

```
BOT_USERNAME=TODO_BOT_USERNAME_QOYING     ← @BotFather
ADMIN_IDS=TODO_TELEGRAM_ID_QOYING         ← @userinfobot
```

Va @BotFather → `/revoke` — eski token oshkor bo'lgan.

---

## Manbalar

- [Districts of Uzbekistan — Wikipedia](https://en.wikipedia.org/wiki/Districts_of_Uzbekistan)
- [Subdivisions of Uzbekistan — Wikipedia](https://en.wikipedia.org/wiki/Subdivisions_of_Uzbekistan)
- [O'zbekiston ochiq ma'lumotlar portali](https://data.gov.uz/uz/datasets/4253)
- [O'zbekiston tumanlari — Vikipediya](https://uz.wikipedia.org/wiki/O%CA%BBzbekiston_tumanlari)

---

*Vositachisiz. 🌿*
