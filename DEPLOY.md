# 🚀 Dehqon Bozori — Deploy qo'llanmasi

Loyihani noldan internetga chiqarish. Uchta xizmat, hammasi bepul tarifda:

| Qism | Xizmat | Nima bo'ladi |
|---|---|---|
| 🗄 Ma'lumotlar bazasi | [Supabase](https://supabase.com) | Postgres — bot va sayt shu yerga yozadi |
| ⚙️ Backend + bot | [Render](https://render.com) | Docker konteyner, API va Telegram bot birga |
| 🌐 Sayt | [Vercel](https://vercel.com) | Next.js frontend |

**Kerak bo'ladi:** GitHub akkaunti, Telegram, ~40 daqiqa vaqt.
Kredit karta **kerak emas**.

### Nima qayerda turadi

```
                    ┌─────────────────────────┐
   Dehqon ──────────►  Telegram bot           │
   (qishloqda)      │                          │  bitta jarayon,
                    │  FastAPI API             │  bitta konteyner
   Xaridor ─┐       └──────────┬───────────────┘
   (bozorda) │                 │  RENDER
             │                 ▼
             │       ┌──────────────────┐
             │       │  Postgres        │  SUPABASE
             │       │  (bitta baza)    │
             │       └──────────────────┘
             │                 ▲
             │                 │
             └───────►┌────────┴─────────┐
                      │  Next.js sayt    │  VERCEL
                      └──────────────────┘
```

Muhim jihati: **bot ham, sayt ham bitta bazaga yozadi.** Sinxronizatsiya yo'q,
chunki kerak emas. Botda joylangan e'lon saytda darhol chiqadi.

Render'da **faqat API va bot** turadi — do'kon oynasi emas. Render manzilini
brauzerda ochsangiz qisqa JSON ko'rasiz, bu to'g'ri.

---

## ⚠️ Boshlashdan oldin — 3 ta muhim gap

**1. Tartib muhim.** Supabase → Render → Vercel. Har biri oldingisining
manzilini talab qiladi. Tartibni buzsangiz, orqaga qaytib tuzatishga to'g'ri
keladi.

**2. Aylanma bog'liqlik bor.** Render'ga Vercel manzili kerak (CORS uchun),
Vercel'ga Render manzili kerak (API uchun). Yechim: Render'ni avval
`CORS_ORIGINS=*` bilan qo'yamiz, Vercel'ni chiqargach orqaga qaytib
qattiqlashtiramiz. Bu 5-bosqichda, unutmang.

**3. Sirlarni hech qachon git'ga qo'ymang.** `.env` fayli allaqachon
`.gitignore` da. Barcha tokenlarni faqat Render/Vercel panelida yozing.

---

## 1-bosqich — Telegram bot yaratish (5 daqiqa)

Bot tokeni Supabase'dan ham oldin kerak bo'ladi, chunki uni Render'ga
yozamiz.

### 1.1 Botni yaratish

1. Telegram'da [@BotFather](https://t.me/BotFather) ni oching
2. `/newbot` yuboring
3. Bot nomini kiriting, masalan: `Dehqon Bozori`
4. Username kiriting — `bot` bilan tugashi shart, masalan: `DehqonBozoriBot`
5. BotFather sizga token beradi:

```
7123456789:AAHxyz-Abc123DefGhi456JklMno789Pqr
```

📋 **Saqlab qo'ying.** Bu `BOT_TOKEN`.
📋 **Username'ni ham saqlang** (`@` siz): `DehqonBozoriBot` → bu `BOT_USERNAME`.

> Token boshqa birovga tushsa, u sizning botingizni to'liq boshqara oladi.
> Tasodifan oshkor bo'lsa, BotFather'da `/revoke` qiling.

### 1.2 O'z Telegram ID'ingizni bilib oling

1. [@userinfobot](https://t.me/userinfobot) ga `/start` yuboring
2. U sizga raqam beradi, masalan `123456789`

📋 Bu `ADMIN_IDS` — sizga `/stats` va `/admin` panelini ochadi.

### 1.3 Rasmlar uchun kanal (tavsiya etiladi)

Render'ning bepul diski **har deploy'da tozalanadi**. Saytdan yuklangan
rasmlar yo'qolmasligi uchun ularni Telegram'da saqlaymiz.

1. Telegram'da yangi **private kanal** yarating (nomi: `Dehqon Bozori rasmlar`)
2. Botingizni kanalga **administrator** qilib qo'shing
3. Kanalga biror xabar yozing
4. O'sha xabarni [@userinfobot](https://t.me/userinfobot) ga **forward** qiling
5. U kanal ID'sini beradi: `-1001234567890`

📋 Bu `PHOTO_ARCHIVE_CHAT_ID`.

> Bo'sh qoldirsangiz ham ishlaydi — lekin saytdan yuklangan rasmlar server
> qayta ishga tushganda yo'qoladi. Botdan yuborilgan rasmlarga ta'sir qilmaydi.

---

## 2-bosqich — Kodni GitHub'ga yuklash (5 daqiqa)

Render ham, Vercel ham GitHub'dan o'qiydi.

```bash
cd "Dehqon Bozori"

git init
git add .
git commit -m "Dehqon Bozori — backend, bot va frontend"
```

Keyin GitHub'da yangi **private** repository yarating va:

```bash
git remote add origin https://github.com/SIZNING-USERNAME/dehqon-bozori.git
git branch -M main
git push -u origin main
```

### ✅ Tekshiring

GitHub'da repo'ni oching va **`.env` fayli ko'rinmasligiga** ishonch hosil
qiling. Agar ko'rinsa — darhol to'xtang:

```bash
git rm --cached backend/.env
git commit -m "Remove .env"
git push
```

va BotFather'da `/revoke` qilib tokenni yangilang.

---

## 3-bosqich — Supabase (10 daqiqa)

### 3.1 Loyiha yaratish

1. [supabase.com](https://supabase.com) → **Start your project** → GitHub bilan kiring
2. **New Project**
3. To'ldiring:
   - **Name:** `dehqon-bozori`
   - **Database Password:** kuchli parol yarating
     📋 **Saqlang!** Keyin ko'rsatilmaydi va u sizga kerak bo'ladi.
   - **Region:** `Central EU (Frankfurt)` — O'zbekistonga eng yaqini
   - **Plan:** `Free`
4. **Create new project** → ~2 daqiqa kuting

> Parolda `@ # $ % &` kabi belgilar bo'lsa, keyin URL'ga yozishda ularni
> kodlash kerak bo'ladi. Osonroq yo'l: faqat harf va raqamdan iborat uzun
> parol tanlang.

### 3.2 Jadvallarni yaratish

1. Chap menyuda **SQL Editor** → **New query**
2. Loyihangizdagi **`backend/supabase/schema.sql`** faylini oching
3. **Butun mazmunini** nusxalab, SQL Editor'ga joylashtiring
4. **Run** (yoki `Ctrl+Enter`)

`Success. No rows returned` chiqishi kerak.

### ✅ Tekshiring

Chap menyuda **Table Editor** → quyidagi 6 ta jadval ko'rinishi kerak:

`users` · `listings` · `favorites` · `contact_events` · `auth_codes` · `web_sessions`

### 3.3 Namuna e'lonlari (ixtiyoriy, lekin tavsiya etaman)

Bo'sh sayt buzuq ko'rinadi. Birinchi haqiqiy dehqon kelguncha 12 ta namuna
e'lon turgani yaxshi — filtrlarni ham, admin paneldagi grafiklarni ham shu
bilan sinab ko'rasiz.

1. **SQL Editor** → **New query**
2. **`backend/supabase/seed.sql`** faylini nusxalab joylashtiring
3. **Run**

6 ta sotuvchi va 12 ta e'lon qo'shiladi. Ikkinchi marta ishga tushirsangiz
nusxa yaratmaydi — fayl o'zi tekshiradi.

> **Haqiqiy sotuvchilar kelganda o'chiring.** Namuna sotuvchilarning ID'si
> `-9001` dan `-9999` gacha:
>
> ```sql
> delete from users where id between -9999 and -9001;
> ```
>
> E'lonlar `on delete cascade` orqali o'zi ketadi.

### 3.4 Migratsiyalar haqida

`backend/supabase/migrations/` papkasida raqamlangan fayllar bor. **Yangi
loyihada ularni ishlatish shart emas** — `schema.sql` ularning hammasini o'z
ichiga oladi.

Ular allaqachon ishlab turgan bazani yangilash uchun. Masalan `0002` —
`public_sellers` ko'rinishidagi RLS teshigini yopadi, `0003` — tuman bo'yicha
qidiruv indekslarini qo'shadi. Keyinroq kod yangilanganda "bu migratsiyani
ishlatish kerakmi?" degan savol tug'ilsa, fayl boshidagi izohda javob bor.

### 3.5 Ulanish manzilini olish

1. Yuqoridagi **Connect** tugmasini bosing
2. Uchta variant chiqadi: *Direct connection*, *Session pooler*,
   *Transaction pooler*

### 🚨 **Session pooler** ni tanlang — Direct connection'ni EMAS

Bu butun deploy'ning eng ko'p xato qilinadigan joyi.

**Nega:** Supabase'ning direct manzili (`db.xxx.supabase.co`) bepul tarifda
faqat **IPv6** orqali ishlaydi. **Render'da esa outbound IPv6 yo'q.** Natijada
server ishga tushmaydi va logda `ENETUNREACH` xatosi chiqadi. Session pooler
`pooler.supabase.com` orqali ketadi — u barcha tariflarda IPv4.

Session pooler manzili shunaqa ko'rinadi:

```
postgresql://postgres.abcdefghijkl:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

### 3.6 Manzilni loyihamiz formatiga o'tkazish

Ikkita o'zgartirish:

1. `postgresql://` → **`postgresql+asyncpg://`**
2. `[YOUR-PASSWORD]` → haqiqiy parolingiz

Natija:

```
postgresql+asyncpg://postgres.abcdefghijkl:MeningParolim123@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

📋 Bu `DATABASE_URL`. Saqlang.

> Diqqat: foydalanuvchi nomi `postgres.abcdefghijkl` — oddiy `postgres` emas.
> Port `5432` (session), `6543` emas.

---

## 4-bosqich — Backend + bot → Render (10 daqiqa)

### 4.1 Xizmat yaratish

1. [render.com](https://render.com) → GitHub bilan kiring
2. **New +** → **Web Service**
3. GitHub repo'ingizni ulang va tanlang
4. Sozlamalar:

| Maydon | Qiymat |
|---|---|
| **Name** | `dehqon-bozori-backend` |
| **Region** | `Frankfurt (EU Central)` |
| **Branch** | `main` |
| **Root Directory** | **`backend`** ← muhim! |
| **Runtime** | `Docker` (avtomatik aniqlanadi) |
| **Instance Type** | `Free` |

> **Root Directory** ni `backend` qilishni unutmang. Aks holda Render
> Dockerfile'ni topa olmaydi.

### 4.2 Environment o'zgaruvchilari

Pastda **Advanced** → **Add Environment Variable**. Quyidagilarni qo'shing:

| Key | Value |
|---|---|
| `BOT_TOKEN` | 1.1-bosqichdagi token |
| `BOT_USERNAME` | `DehqonBozoriBot` (`@` siz) |
| `DATABASE_URL` | 3.6-bosqichdagi manzil |
| `ADMIN_IDS` | 1.2-bosqichdagi Telegram ID |
| `ADMIN_API_TOKEN` | quyidagi buyruq bilan yarating |
| `PHOTO_ARCHIVE_CHAT_ID` | 1.3-bosqichdagi kanal ID |
| `CORS_ORIGINS` | `*` — 6-bosqichda o'zgartiramiz |
| `ENV` | `production` |

`ADMIN_API_TOKEN` uchun terminalda:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

> `PORT` ni qo'lda yozmang — Render uni o'zi beradi, dastur o'shani oladi.
> `PUBLIC_BASE_URL` ni ham hozir tashlab keting, 4.4 da qo'shamiz.
>
> `SERVE_LEGACY_WEB` ni ham yozmang. U standart holda `false` va shundayligicha
> qolishi kerak — sayt Vercel'da, Render'da emas.

#### Ikkitasini bo'sh qoldirmang

`BOT_USERNAME` va `ADMIN_IDS` ixtiyoriy ko'rinadi, lekin har biri jimgina
bitta funksiyani o'chiradi:

| Bo'sh qolsa | Nima ishlamaydi |
|---|---|
| `BOT_USERNAME` | Saytdagi «Telegram orqali kirish» — sotuvchi saytdan e'lon qo'sha olmaydi |
| `ADMIN_IDS` | Botdagi `/admin` va `/stats`, saytdagi admin panel |
| `ADMIN_API_TOKEN` | `POST /listings` va boshqa mashina endpointlari (503) |

Ilova ishga tushganda ularning har biri uchun logda ogohlantirish chiqadi —
4.3-bosqichda o'shani qidiring.

### 4.3 Deploy

**Create Web Service** → Render Docker image quradi. Birinchi qurish
**5–10 daqiqa** oladi.

Logda quyidagini kutasiz:

```
Dehqon Bozori | mode=all env=production db=postgresql+asyncpg port=10000
INFO:     Uvicorn running on http://0.0.0.0:10000
Bot polling started
==> Your service is live 🎉
```

#### Logdagi `SOZLAMA:` qatorlarini o'qing

Ishga tushishda dastur yarim sozlangan har bir qiymat uchun ogohlantirish
chiqaradi. Masalan:

```
WARNING | SOZLAMA: BOT_USERNAME bo'sh — saytdagi «Telegram orqali kirish» ishlamaydi
WARNING | SOZLAMA: PHOTO_ARCHIVE_CHAT_ID bo'sh — saytdan yuklangan rasmlar ...
```

Bular xato emas — server baribir ishlaydi va xaridorlar e'lonlarni ko'radi.
Lekin har bir qator sizga aytilmasa jimgina buziladigan narsani ko'rsatadi.
**Nol dona `SOZLAMA:` qatori** — hammasi joyida degani.

### 4.4 Manzilni qo'shish

Render sizga manzil beradi, masalan:
`https://dehqon-bozori-backend.onrender.com`

📋 Saqlang — bu `RENDER_URL`.

Endi **Environment** bo'limiga qaytib, yana bitta o'zgaruvchi qo'shing:

| Key | Value |
|---|---|
| `PUBLIC_BASE_URL` | `https://dehqon-bozori-backend.onrender.com` |

**Save changes** → Render avtomatik qayta deploy qiladi.

### ✅ Tekshiring

Brauzerda oching:

```
https://dehqon-bozori-backend.onrender.com/health
```

Kutilgan javob:

```json
{"status":"ok","database":"postgresql+asyncpg","env":"production"}
```

`"database":"postgresql+asyncpg"` — demak Supabase ulandi. Agar
`sqlite+aiosqlite` chiqsa, `DATABASE_URL` noto'g'ri yozilgan.

Yana uchtasi:

- `https://.../api/docs` — API hujjatlari ochilishi kerak
- `https://.../` — **sayt emas**, quyidagicha qisqa JSON chiqadi:

  ```json
  {"service":"Dehqon Bozori API","docs":"/api/docs","health":"/health", ...}
  ```

  Bu to'g'ri. Render'da faqat API va bot turadi; do'kon oynasi Vercel'da
  bo'ladi. (Ilgari bu yerda eski PWA turardi — u endi arxivlangan.)

- Telegram'da botingizga `/start` yuboring — javob berishi kerak
  (birinchi javob ~1 daqiqa kechikishi mumkin, bu normal — 8-bo'limga qarang)

---

## 5-bosqich — Sayt → Vercel (7 daqiqa)

### 5.1 Loyiha yaratish

1. [vercel.com](https://vercel.com) → GitHub bilan kiring
2. **Add New...** → **Project**
3. Repo'ingizni **Import** qiling
4. Sozlamalar:

| Maydon | Qiymat |
|---|---|
| **Framework Preset** | `Next.js` (avtomatik) |
| **Root Directory** | **`frontend`** ← **Edit** bosib o'zgartiring! |

> Bu ham eng ko'p unutiladigan qadam. `frontend` deb ko'rsatmasangiz, Vercel
> repo ildizida `package.json` topa olmay xato beradi.

### 5.2 Environment o'zgaruvchilari

**Environment Variables** bo'limida:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://dehqon-bozori-backend.onrender.com` |
| `NEXT_PUBLIC_BOT_USERNAME` | `DehqonBozoriBot` |

> Oxirida `/` qo'ymang.
> `NEXT_PUBLIC_` bilan boshlanuvchi o'zgaruvchilar brauzerga ko'rinadi —
> bu yerga hech qachon maxfiy kalit yozmang.

### 5.3 Deploy

**Deploy** → 2–3 daqiqa.

Qurish jarayonida Vercel avval `npm run gen:districts` ni ishga tushiradi — u
`backend/app/districts.py` dan 205 ta tuman va shaharni o'qib,
`frontend/lib/districts.ts` ni qayta yaratadi. Shuning uchun **Root Directory
`frontend` bo'lsa ham, repo'ning ildizi kerak** — Vercel butun repo'ni
klonlaydi, shuning uchun bu o'zi ishlaydi.

Vercel manzil beradi: `https://dehqon-bozori.vercel.app`

📋 Saqlang — bu `VERCEL_URL`.

### ✅ Tekshiring

Saytni oching. Ko'rishingiz kerak:

- Bosh sahifa, yashil dizayn, "Vositachisiz" sarlavhasi
- E'lonlar ro'yxati (3.3 da seed qilgan bo'lsangiz — 11 ta faol e'lon)
- **Sariq ogohlantirish CHIQMASLIGI kerak.** Agar “Namuna ma’lumotlari
  ko’rsatilmoqda” degan yozuv chiqsa — sayt backend'ga ulana olmayapti,
  9-bo'limga qarang.
- Hudud filtridan **Samarqand** ni tanlang → yonida **tuman filtri** paydo
  bo'lishi kerak. Chiqmasa, `districts.ts` yaratilmagan — 9-bo'limga qarang.

---

## 6-bosqich — CORS'ni qattiqlashtirish (2 daqiqa)

Hozir backend har qanday saytdan so'rov qabul qiladi. Endi Vercel manzilingiz
ma'lum — cheklaymiz.

1. Render → xizmatingiz → **Environment**
2. `CORS_ORIGINS` ni toping va o'zgartiring:

```
https://dehqon-bozori.vercel.app
```

> Agar keyin o'z domeningizni ulasangiz, vergul bilan qo'shing:
> `https://dehqon-bozori.vercel.app,https://dehqonbozori.uz`

3. **Save changes** → qayta deploy

### ✅ Tekshiring

Vercel saytini qayta yuklang — e'lonlar hamon ko'rinishi kerak. Ko'rinmasa,
manzilni noto'g'ri yozgansiz (`https://` bormi? oxirida `/` yo'qmi?).

---

## 7-bosqich — To'liq tekshiruv

Hammasi ishlayotganini bilish uchun bitta e'lonni boshidan oxirigacha o'tkazing.

| # | Amal | Kutilgan natija |
|---|---|---|
| 1 | Botga `/start` | Til tanlash yoki salomlashish chiqadi |
| 2 | Botda **➕ E'lon berish** → hudud tanlang | **Tuman tugmalari** chiqadi (shaharlar 🏙 bilan birinchi) |
| 3 | E'lonni oxirigacha to'ldiring | "E'lon joylandi" |
| 4 | Vercel saytini yangilang | O'sha e'lon **saytda**, to'g'ri tuman nomi bilan ko'rinadi |
| 5 | E'lonni ochib **📞 Qo'ng'iroq** bosing | Telegram'ga "Xaridor qiziqdi!" xabari keladi |
| 6 | Saytda `/sotuvchi/elon-qoshish` → Telegram orqali kiring | Botda tasdiqlagach saytga qaytadi |
| 7 | Saytdan rasm bilan e'lon qo'shing — viloyat, keyin tuman | E'lon chiqadi, rasm ko'rinadi |
| 8 | Botda **📋 E'lonlarim** | Saytdan qo'shilgan e'lon **botda** ko'rinadi |
| 9 | Botga `/admin` → **➕ Dehqon uchun e'lon** | Telefon raqami so'raladi, oxirida e'lon qo'shiladi |
| 10 | `https://SIZNING-SAYT.vercel.app/sotuvchi/admin` | Statistika paneli (faqat `ADMIN_IDS` uchun) |
| 11 | Saytni ochiq qoldiring, botdan yangi e'lon qo'shing | ~30 soniyada e'lon **o'zi** paydo bo'ladi |

**Eng muhim qadamlar — 4 va 8.** Ular bot va sayt bitta bazani baham
ko'rayotganini isbotlaydi. **11-qadam** — real-time ishlayotganini.

> Admin panel endi **Vercel'da**, `/sotuvchi/admin` manzilida — Render'dagi
> eski `/admin` emas. Eski PWA arxivlangan.
>
> Bir xil e'lonni botda va saytda ochib, **emojisi bir xil ekanini** ham
> tekshiring. Ilgari sabzavot botda 🥕, saytda 🥬 chiqardi.

---

## 8-bosqich — Bepul tariflarning cheklovlari

Bularni bilib qo'ying — birinchi haqiqiy foydalanuvchilar kelguncha qaror
qilishingiz kerak.

### Render — 15 daqiqadan keyin uxlaydi

Bepul xizmat **15 daqiqa** hech qanday so'rov kelmasa o'chadi, keyingi
so'rovda **~1 daqiqa** ichida uyg'onadi. Bepul tarifda oyiga **750 soat**
instance vaqti bor (bir xizmat uchun bu deyarli butun oy).

Nimaga ta'sir qiladi: dehqon botga `/start` yozsa, javob bir daqiqa
kechikishi mumkin — va u shu vaqt ichida botni tashlab ketishi mumkin.
Xaridor saytni ochsa, birinchi sahifa sekin yuklanadi.

Yana bir nozik joy: xizmat o'chganda **konteyner ichidagi hamma fayl
yo'qoladi**. Shuning uchun `PHOTO_ARCHIVE_CHAT_ID` muhim (1.3-bosqich).

**Yechimlar:**

| Yo'l | Narx | Izoh |
|---|---|---|
| Shunday qoldirish | 0$ | Sinov davri uchun yetarli |
| [UptimeRobot](https://uptimerobot.com) bilan har 10 daqiqada `/health` ni chertish | 0$ | Ishlaydi, lekin Render'da bepul xizmatni doim uyg'oq tutishning rasmiy yo'li yo'q va bu qoidalar ruhiga zid |
| Render **Starter** | ~$7/oy | Halol yechim. Haqiqiy sotuvchilar ishlata boshlaganda shunga o'ting |

### Supabase — 7 kundan keyin to'xtaydi

Bepul loyiha **7 kun baza faoliyatisiz** qolsa, avtomatik pauza qilinadi.
Ma'lumot yo'qolmaydi, lekin baza javob bermay qo'yadi va uni panelda qo'lda
**Restore** qilish kerak.

> Diqqat: "faoliyat" deganda **bazaga so'rov** tushuniladi. Dashboard'ga
> kirish yoki keshdan qaytgan javob hisoblanmaydi.

Boshqa cheklovlar (2026-yil iyul holati): **500 MB** baza, **1 GB** fayl,
**5 GB** chiquvchi trafik, bir vaqtda **2 ta** faol loyiha, umumiy CPU va
500 MB RAM. Pauzani butunlay yo'qotish — **Pro, $25/oy**.

Tijorat maqsadida ishlatishga ruxsat bor, karta talab qilinmaydi.

> 500 MB bu loyiha uchun juda ko'p — o'n minglab e'lon sig'adi. Rasmlar
> Telegram'da saqlanadi, bazada emas.

### Vercel — Hobby tarifi tijorat uchun emas

Bu jiddiy huquqiy nuqta, aytib o'tishim kerak: Vercel'ning bepul **Hobby**
tarifi shartlariga ko'ra **faqat shaxsiy, notijorat loyihalar** uchun. Daromad
keltiradigan yoki tijoriy loyiha **Pro** ($20/oy) da bo'lishi kerak.

Dehqon Bozori hozir hech kimdan pul olmaydi, shuning uchun sinov bosqichida
Hobby'da turishi mumkin. Lekin komissiya, reklama yoki pullik xizmat
qo'shsangiz — **o'sha kuni** Pro'ga ($20/oy) o'ting. Vercel buni kuzatadi va
qoidabuzar loyihalarni to'xtatadi.

Boshqa cheklovlar: oyiga 100 GB trafik — bu loyiha uchun uzoq vaqt yetadi.

> Bu men huquqiy maslahat berayotganim emas — shartlar o'zgarishi mumkin,
> pul ishlata boshlashdan oldin Vercel'ning o'z sahifasini o'qib chiqing.

---

## 9-bosqich — Muammolarni hal qilish

### Render logda `ENETUNREACH` yoki `Network is unreachable`

**Sabab:** Direct connection ishlatilgan (IPv6). Render IPv6'ni
qo'llab-quvvatlamaydi.

**Yechim:** `DATABASE_URL` da manzil `pooler.supabase.com` bo'lishi kerak,
`db.xxx.supabase.co` emas. 3.5-bosqichga qayting va **Session pooler** ni
oling.

### `password authentication failed`

Parolda maxsus belgi bor va u URL'da kodlanmagan.

| Belgi | O'rniga yozing |
|---|---|
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |
| `&` | `%26` |
| `/` | `%2F` |

Osonroq yo'l: Supabase → **Settings** → **Database** → **Reset database
password** → faqat harf va raqamdan iborat parol qo'ying.

### `/health` da `"database":"sqlite+aiosqlite"` chiqyapti

`DATABASE_URL` umuman o'qilmagan. Render → Environment'da kalit nomi
**aynan** `DATABASE_URL` ekanini tekshiring (bo'sh joy yoki xato harfsiz).

### Saytda "Namuna ma'lumotlari ko'rsatilmoqda" ogohlantirishi

Frontend backend'ga ulana olmayapti. Ketma-ket tekshiring:

1. `https://SIZNING-RENDER.onrender.com/health` brauzerda ochiladimi?
   (Ochilmasa — muammo Render'da, saytda emas)
2. Vercel → Settings → Environment Variables → `NEXT_PUBLIC_API_URL` to'g'rimi?
   `https://` bormi? Oxirida `/` **yo'qmi**?
3. O'zgartirgan bo'lsangiz — Vercel'da **Deployments** → **Redeploy**.
   `NEXT_PUBLIC_*` o'zgaruvchilari qurish paytida kodga yoziladi, shuning uchun
   qayta deploy shart.
4. Brauzerda `F12` → **Console** → CORS xatosi bormi? Bo'lsa, 6-bosqich.

### Saytda «Telegram orqali kirish» bosilganda xato chiqadi

Javob `503` va matnda `BOT_USERNAME sozlanmagan` bo'lsa — Render'da
`BOT_USERNAME` bo'sh yoki xato yozilgan.

To'g'ri qiymat: `@` **belgisisiz**, faqat username. `DehqonBozoriBot` — to'g'ri,
`@DehqonBozoriBot` — xato.

Render → Environment → tuzating → Save. Log'da endi `SOZLAMA: BOT_USERNAME`
qatori chiqmasligi kerak.

### Hudud tanlanganda tuman filtri chiqmayapti

Ikki sabab bo'lishi mumkin:

1. **O'sha hududda hali e'lon yo'q.** Filtr faqat mahsuloti bor tumanlarni
   ko'rsatadi — bo'sh filtr ko'rsatishdan ma'nosi yo'q. Boshqa hududni sinang
   yoki `seed.sql` ni ishlating (3.3-bosqich).
2. **`districts.ts` yaratilmagan.** Vercel logida `gen-districts` qatorini
   qidiring:

   ```
   gen-districts: wrote lib/districts.ts — 14 regions, 205 districts
   ```

   Chiqmagan bo'lsa, Vercel `backend/app/districts.py` ni topa olmagan —
   Root Directory `frontend` bo'lsa ham repo to'liq klonlangan bo'lishi kerak.
   Vercel → Settings → Git → **Ignored Build Step** bo'sh ekanini tekshiring.

### Botda tuman tugmalari o'rniga eski matn savoli chiqyapti

Render eski kodni ishlatyapti. Deploy tugaganini tekshiring:
Render → **Events** → oxirgi deploy `Live` holatidami?

Bot uzoq ishlab turgan bo'lsa, Telegram eski klaviaturani keshlagan bo'lishi
mumkin — botga `/cancel` yuborib, e'lon berishni qaytadan boshlang.

### Bot javob bermayapti

1. Render logda `Bot polling started` bormi?
2. `409 Conflict` xatosi bormi? Demak bot **ikki joyda** ishlayapti — kompyuteringizdagi
   `python -m app.main` ni to'xtating. Telegram bitta botga bitta polling'ga ruxsat beradi.
3. `BOT_TOKEN` to'g'rimi? BotFather'da `/mybots` orqali tekshiring.
4. 15 daqiqa kutilmagan bo'lsa — server uxlab qolgan, 30 soniya kuting.

### Vercel'da `No Next.js version detected`

**Root Directory** `frontend` qilib qo'yilmagan.
Vercel → Settings → General → Root Directory → `frontend` → Save → Redeploy.

### Saytdan yuklangan rasmlar yo'qoldi

`PHOTO_ARCHIVE_CHAT_ID` qo'yilmagan va server qayta ishga tushgan. 1.3-bosqichni
bajaring. Eski rasmlarni tiklab bo'lmaydi, lekin botdan yuborilganlari joyida.

### Deploy'dan keyin sayt eski ko'rinishda

Brauzer service worker'ni keshlab qo'ygan. `Ctrl+Shift+R` (yoki telefonda
saytni yopib qayta oching).

---

## 10-bosqich — Keyingi yangilanishlar

Kod o'zgartirganingizdan keyin:

```bash
git add .
git commit -m "nima o'zgardi"
git push
```

Render ham, Vercel ham `main` branch'ni kuzatadi va **avtomatik** qayta deploy
qiladi. Qo'lda hech narsa qilish shart emas.

**Deploy'dan oldin** har doim:

```bash
python test_all.py                              # backend · contract · bot · frontend · security
cd frontend && npm run check                    # verify + typecheck + lint + vitest
cd frontend && npm run build                    # Vercel nimani qilsa, shuni
cd backend  && docker build -t dehqon-bozori .  # Render nimani qilsa, shuni
```

`.github/workflows/ci.yml` shularning hammasini har push'da o'zi ishlatadi,
shuning uchun GitHub'da yashil belgi turgan bo'lsa deploy xavfsiz.

> Agar `python test_all.py` da `district slugs` bilan bog'liq xato chiqsa —
> `cd frontend && npm run gen:districts` ni ishlatib, natijani commit qiling.
> `districts.ts` — yaratiladigan fayl, va u eskirgan bo'lishi mumkin.

Environment o'zgaruvchisini o'zgartirsangiz:

- **Render** — o'zi qayta deploy qiladi
- **Vercel** — **qo'lda** Redeploy kerak (`NEXT_PUBLIC_*` kod ichiga yoziladi)

---

## 📋 Yakuniy ro'yxat

Deploy tugagach hammasi shu holatda bo'lishi kerak:

**Backend (Render)**

- [ ] `https://...onrender.com/health` → `{"status":"ok","database":"postgresql+asyncpg"}`
- [ ] `https://...onrender.com/api/docs` ochiladi
- [ ] `https://...onrender.com/` → API haqida JSON (sayt emas — bu to'g'ri)
- [ ] Render logida **nol dona** `SOZLAMA:` ogohlantirishi
- [ ] `CORS_ORIGINS` — `*` emas, aniq Vercel manzili

**Sayt (Vercel)**

- [ ] `https://...vercel.app` ochiladi, sariq ogohlantirishsiz
- [ ] Hudud tanlansa **tuman filtri** paydo bo'ladi
- [ ] Vercel build logida `gen-districts: wrote lib/districts.ts` bor
- [ ] `/sotuvchi/admin` — admin paneli ochiladi (faqat sizga)

**Bot va sayt bitta ekanini isbotlash**

- [ ] Botga `/start` — javob bor
- [ ] Botda e'lon berishda **tuman tugmalari** chiqadi
- [ ] Botdan qo'shilgan e'lon **saytda** to'g'ri tuman nomi bilan ko'rinadi
- [ ] Saytdan qo'shilgan e'lon **botda** ko'rinadi
- [ ] Bir xil e'lonning **emojisi** botda va saytda bir xil
- [ ] Sayt ochiq turganda yangi e'lon ~30 soniyada **o'zi** chiqadi
- [ ] Saytda "Qo'ng'iroq" bosilganda Telegram'ga xabar keladi
- [ ] Botda `/admin` → dehqon nomidan e'lon qo'shish ishlaydi

**Xavfsizlik**

- [ ] GitHub repo'da `.env` fayli **yo'q**
- [ ] Supabase Table Editor'da 6 ta jadval bor
- [ ] Namuna ma'lumotlari o'chirilgan (haqiqiy sotuvchilar kelgan bo'lsa)

---

## 🔐 Sirlar ro'yxati — qayerda saqlanadi

| Sir | Qayerda | Hech qachon qayerda emas |
|---|---|---|
| `BOT_TOKEN` | Render Environment | git, frontend, brauzer |
| `DATABASE_URL` | Render Environment | git, frontend |
| `ADMIN_API_TOKEN` | Render Environment | git, frontend |
| Supabase parol | parol menejeringiz | git |
| `NEXT_PUBLIC_API_URL` | Vercel Environment | — (bu ochiq, muammo yo'q) |
| `SUPABASE_SERVICE_ROLE_KEY` | **kerak emas** | hech qayerda |

> Backend Supabase'ga Postgres protokoli orqali ulanadi, REST API orqali emas.
> Shuning uchun `service_role` kaliti umuman kerak emas — himoya qilinadigan
> bitta sir kam.

---

## 📚 Manbalar

Bepul tariflar shartlari o'zgarib turadi. Yuqoridagi raqamlar **2026-yil
28-iyul** holatiga ko'ra tekshirilgan:

- [Render — Deploy for Free](https://render.com/docs/free) — 15 daqiqa, 750 soat/oy
- [Render — Your First Deploy](https://render.com/docs/your-first-deploy)
- [Supabase Free Tier Limits 2026](https://automationatlas.io/answers/supabase-free-tier-limits-2026/) — 7 kun, 500 MB
- [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby) — tijorat cheklovi

Pul to'lashdan yoki tijoratga o'tishdan oldin har birining o'z sahifasini
qayta o'qing.

---

*Savol tug'ilsa — `backend/README.md` va `frontend/README.md` da texnik
tafsilotlar bor. Omad! 🌿*
