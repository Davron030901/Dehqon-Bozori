# 📱 Dehqon Bozori — mobil ilova

Android va iOS uchun ilova (Expo SDK 57, React Native 0.86, Expo Router).
Sayt va Telegram bot bilan **bitta backend, bitta baza**: botda joylangan e'lon
ilovada darhol chiqadi, ilovada joylangani — saytda va botda.

| Kim uchun | Nima qila oladi |
|---|---|
| **Xaridor** (ro'yxatdan o'tmaydi) | Lenta, qidiruv, 11 kategoriya, viloyat → tuman filtri, saralash, cheksiz aylantirish, ♡ saqlash, sotuvchi sahifasi, 📞 qo'ng'iroq / Telegram / WhatsApp, ulashish, shikoyat |
| **Sotuvchi** (Telegram orqali kiradi) | Rasm bilan e'lon joylash (kamera yoki galereya), to'liq tahrirlash, sotildi deb belgilash, o'chirish, nechta xaridor bog'langanini ko'rish, profil |
| **Admin** (`ADMIN_IDS` da) | Statistika, xaridor shikoyatlari, telefon qilgan dehqon nomidan e'lon |

Ilova **o'zbek va rus** tillarida (botdagidek). Tuman nomlari ikkala tilda ham
o'zbekcha — bot bilan bir xil qoida.

---

## 1. Kompyuterda ishga tushirish

```bash
cd mobile
npm install
cp .env.example .env.local     # API manzilini yozing (pastga qarang)
npx expo start
```

Telefoningizga **Expo Go** ilovasini o'rnating (Play Market / App Store) va
terminalda chiqqan QR kodni skanerlang.

### API manzili — eng ko'p uchraydigan xato

`.env.local` faylida:

```
EXPO_PUBLIC_API_URL=http://192.168.1.10:8000
```

⚠️ Telefonda `localhost` — bu **telefonning o'zi**, kompyuteringiz emas.
Kompyuterning lokal tarmoqdagi IP manzilini yozing (Windows: `ipconfig`,
Mac/Linux: `ip addr`) va backend'ni `0.0.0.0` da ishga tushiring (standart
holatda shunday). Yoki to'g'ridan-to'g'ri Render manzilini yozing:

```
EXPO_PUBLIC_API_URL=https://dehqon-bozori-backend.onrender.com
```

**Bo'sh qoldirsangiz** ilova namuna e'lonlar bilan ishlaydi va ekranda buni
ochiq aytadi — dizaynni ko'rish uchun qulay.

---

## 2. APK yasash (telefonga o'rnatiladigan fayl)

Android Studio kerak emas — EAS bulutda yig'adi.

```bash
npm install -g eas-cli          # yoki har safar: npx eas-cli@latest
eas login                       # bepul Expo akkaunti
eas init                        # birinchi marta: loyihani akkauntga bog'laydi
npm run build:apk               # = eas build --platform android --profile preview
```

10–15 daqiqadan so'ng EAS havola beradi — shu havoladan `.apk` ni yuklab,
istalgan Android telefonga o'rnatish mumkin. Havolani backend'dagi
`ANDROID_APP_URL` ga va saytdagi `NEXT_PUBLIC_ANDROID_APP_URL` ga qo'ysangiz,
bot va sayt «📱 Android ilovani yuklab olish» tugmasini ko'rsatadi.

API manzili `eas.json` dagi `preview` va `production` profillarida yozilgan —
Render'dagi haqiqiy manzilingiz boshqacha bo'lsa, o'sha yerda o'zgartiring.

### Play Market uchun

```bash
eas build --platform android --profile production   # .aab fayl
eas submit --platform android                        # Google Play Console'ga yuklaydi
```

Google Play dasturchi akkaunti ($25, bir martalik) kerak.

---

## 3. Tekshiruvlar

```bash
npm run check     # verify + typecheck + lint + vitest
npm run bundle    # Android JS bundle'ni Metro bilan yig'adi — haqiqiy kompilyatsiya
```

| Tekshiruv | Nimani himoya qiladi |
|---|---|
| `npm run verify` | Kategoriya/birlik/viloyat nomlari **uz va ru** da `backend/app/catalog.py` bilan harfma-harf bir xil; `districts.ts` eskirmagan; faqat `lib/api.ts` tarmoqqa chiqadi; token faqat SecureStore'da; ekranlarda qattiq yozilgan matn yo'q |
| `npm run typecheck` | TypeScript — jumladan, ruscha lug'atda o'zbekchadagi har bir kalit borligi |
| `npm run test` | Narx formati, sanalar (uz/ru), telefon havolalari, API javobini o'girish, filtrlar |
| `python tests/test_mobile.py` (ildizdan) | `app.json`/`eas.json` APK yig'ishga tayyor, ekranlar joyida |
| `python tests/test_contract.py` | Ilova o'qiydigan JSON maydonlari haqiqiy API'da bor; ilova chaqiradigan har bir endpoint mavjud |

CI (`.github/workflows/ci.yml`) bularning hammasini har push'da ishlatadi.

---

## 4. Tuzilma

```
mobile/
├── app.json            Expo konfiguratsiyasi: nom, ikonka, ruxsat matnlari
├── eas.json            APK / Play Market yig'ish profillari
├── src/
│   ├── app/            ekranlar (Expo Router — har bir fayl bitta ekran)
│   │   ├── (tabs)/     Bozor · Saqlangan · Sotish · Kabinet · Profil
│   │   ├── mahsulot/[id].tsx   e'lon sahifasi
│   │   ├── dehqon/[id].tsx     sotuvchi sahifasi
│   │   ├── tahrirlash/[id].tsx tahrirlash
│   │   └── admin.tsx
│   ├── components/     ListingCard, ListingForm, LoginPanel, SelectSheet…
│   └── lib/
│       ├── api.ts      tarmoqqa chiqadigan yagona joy
│       ├── catalog.ts  kategoriya/birlik/viloyat (catalog.py nusxasi, tekshiriladi)
│       ├── districts.ts  GENERATED — backend/app/districts.py dan
│       ├── i18n.ts     barcha matnlar, uz + ru
│       ├── storage.ts  token → SecureStore, qolgani → AsyncStorage
│       ├── photo.ts    rasm: 1280px, JPEG ~80% (qishloq 3G uchun)
│       └── queries.ts  React Query hook'lari (kesh, qayta urinish)
└── tests/              vitest
```

### Qarorlar

- **Kirish Telegram orqali** — saytdagidek. Parol ham, SMS ham yo'q: ilova
  `t.me/<bot>?start=login_<kod>` ni ochadi, bot tasdiqlaydi, ilova token oladi.
  Hisob — botdagi hisob, shuning uchun botdagi e'lonlar shu yerda bo'ladi.
- **Ichki chat yo'q** — ataylab. Savdo qishloqda qanday bo'lsa shunday:
  telefon orqali. Xaridor «Qo'ng'iroq» bossa, sotuvchiga bir soniyada
  Telegram xabari boradi.
- **Push-bildirishnomalar yo'q** — sotuvchilar xabarni Telegram'da allaqachon
  oladi; ikkinchi kanal ularni faqat chalg'itadi.
- **Rasm yuklashdan oldin kichraytiriladi** — 8 MB kamera rasmi 3G'da bir
  daqiqa yuklanadi va ko'pincha uziladi; 300 KB esa bir necha soniyada.
- **Sevimlilar** mehmon uchun telefonda saqlanadi; kirgandan keyin akkauntga
  qo'shiladi va bot ⭐ / sayt ♡ bilan bitta ro'yxat bo'ladi.
- **Ko'rishlar halol sanaladi** — e'lon ekrani ochilganda bir marta;
  tahrirlash ekrani ko'rish sanamaydi.
