# Navbatdagi ish — sizdan kutilayotgan qadamlar

**Yangilangan:** 2026-10-04

Kod tayyor va tekshirilgan (`HOLAT-HISOBOTI.md`). Qolgani — faqat siz
bajara oladigan ishlar: sirlar, akkauntlar va haqiqiy telefonda sinov.

---

## 1. Faqat siz biladigan qiymatlar

`backend/.env` (lokal) va Render Environment'da:

```
BOT_USERNAME=...        ← @BotFather'dagi bot nomi, @ belgisisiz
ADMIN_IDS=...           ← @userinfobot bergan Telegram ID
SITE_URL=https://...    ← Vercel'dagi sayt manzili (yangi!)
```

🔐 Agar bot tokeni avval biror joyda oshkor bo'lgan bo'lsa: @BotFather →
`/revoke` → yangi token → Render'dagi `BOT_TOKEN`.

## 2. Mavjud bazani yangilash

Supabase → SQL Editor → shu ikki faylni tartib bilan bir martadan ishga
tushiring:

1. `backend/supabase/migrations/0004_reports.sql` — shikoyatlar jadvali + RLS
2. `backend/supabase/migrations/0005_login_match_and_phones.sql` — kirishni
   tasdiqlash raqami va eski telefonlarni `+998…` ga o'tkazish

Yangi loyihada `schema.sql` yetarli.

## 3. Deploy

To'liq qo'llanma: **[`DEPLOY.md`](DEPLOY.md)**. Yangi qo'shilganlari:

- Render: `SITE_URL`, ixtiyoriy `ANDROID_APP_URL`
- Vercel: `NEXT_PUBLIC_SITE_URL`, ixtiyoriy `NEXT_PUBLIC_ANDROID_APP_URL`
- **11-bosqich** — mobil ilovaning APK'sini yig'ish

## 4. Mobil ilova — APK

```bash
cd mobile
npm install
npx eas-cli@latest login
npx eas-cli@latest init
npm run build:apk
```

Avval `mobile/eas.json` dagi `EXPO_PUBLIC_API_URL` Render manzilingizga mos
ekanini tekshiring.

## 5. Haqiqiy telefonda bir marta sinab ko'ring

Ilova brauzerda va kompilyatorda tekshirildi, lekin bularni faqat telefon
ko'rsata oladi:

- [ ] «Sotish» → **Suratga olish** — kamera ruxsati so'raladi, rasm chiqadi
- [ ] Rasm bilan e'lon joylandi, saytda rasm ko'rinadi
- [ ] «Telegram orqali kirish» → ilova ikki xonali raqam ko'rsatadi →
      Telegram ochiladi → Start → botda **o'sha raqamni** tanlang → ilovaga
      qaytganda avtomatik kirgan bo'lasiz
- [ ] Botda boshqa raqamni tanlasangiz, ilova «rad etildi» deydi va kirmaydi
- [ ] E'londagi «Qo'ng'iroq qilish» telefon raqamini teradi, sotuvchiga
      Telegram xabari keladi
- [ ] Rus tiliga o'tib, ilovani yopib-ochsangiz til saqlanib qoladi

Biror narsa ishlamasa — skrinshot yoki xato matnini yuboring.

---

## Keyingi bosqich g'oyalari (shart emas)

| G'oya | Nima uchun |
|---|---|
| Payme / Click | README'dagi 2-bosqich: to'lov platforma ichida |
| Sotuvchi reytingi | Xaridor ishonchi; shikoyatlar tizimi bunga asos |
| E'lon muddati (masalan 30 kun) va «yangilash» tugmasi | Eski hosil e'lonlari lentada qolib ketmasligi uchun |
| Bozor narxlari statistikasi | 3-bosqich: vositachi ustamasini ochiq ko'rsatish |
| Expo push-bildirishnomalar | Telegram'siz sotuvchilar uchun |

---

*Vositachisiz. 🌿*
