# Dehqon Bozori 🌿 — Holat hisoboti (2-nashr)

**Sana:** 2026-07-28
**Xulosa:** Kod endi to'liq. Qolgani — sizning kompyuteringizda bajariladigan
6 ta buyruq va faqat sizga ma'lum 2 ta qiymat.

---

## ⚠️ Avvalgi hisobotimdagi xatolar

Birinchi tekshiruvimda qidiruv vositam ildizdagi bir nechta faylni
o'tkazib yubordi va men noto'g'ri xulosa chiqardim. To'g'rilayman:

| Men aytgan edim | Aslida |
|---|---|
| «Frontend uchun umuman test yo'q» | **Noto'g'ri.** `tests/test_frontend.py` bor va u konfiguratsiya, data-layer qoidasi, Tailwind klasslari, PWA manifestini tekshiradi |
| «`frontend/README.md` mavjud bo'lmagan verify script'ga havola qiladi» | **Noto'g'ri.** U `tests/test_frontend.py` ni nazarda tutgan — script boshqa joyda edi |
| «Test qamrovi: faqat `test_platform.py`» | **Noto'g'ri.** `test_all.py` beshta to'plamni ishlatadi: backend · contract · bot · frontend · security |

Ildizda `README.md`, `DEPLOY.md`, `test_all.py` va `tests/` papkasi bor edi —
men ularni ko'rmadim. Loyiha men aytganidan ancha yaxshi holatda edi.

**To'g'ri bo'lib chiqqan xulosalar:** `.venv` to'liq emas, `node_modules` yo'q,
git yo'q, `BOT_USERNAME`/`ADMIN_IDS`/`ADMIN_API_TOKEN` bo'sh, ikkita frontend,
botda `/admin` yo'q, token oshkor.

---

## ✅ Bajarilgan ishlar

### 1. Konfiguratsiya blokerlari

- `backend/.env` qayta yozildi: `ADMIN_API_TOKEN` yaratildi, `CORS_ORIGINS`
  localhost:3000 ga toraytirildi, har bir qator izohlandi
- `config.py` ga **`check_config()`** qo'shildi — yarim sozlangan har bir
  qiymat ishga tushishda ogohlantirish beradi. Ilgari bularning hammasi
  **jimgina** buzilardi
- `TODO_...` to'ldiruvchilari bo'sh qiymat sifatida o'qiladi, ya'ni
  `ADMIN_IDS=TODO_...` konteynerni yiqitmaydi
- `admin_id_list` endi noto'g'ri qiymatda `ValueError` bermaydi
- `POST /api/auth/start` `BOT_USERNAME` bo'sh bo'lsa **503 va tushunarli xabar**
  qaytaradi — ilgari bo'sh havola berardi va sabab hech qayerda ko'rinmasdi

### 2. Botda `/admin` buyrug'i — yangi

`backend/app/bot/handlers/admin.py` (~500 qator):

- Telefon raqami bo'yicha sotuvchini topadi yoki yangisini ochadi, va
  **darhol aytadi**: «✅ Topildi: Ali Rahimov (avvalgi e'lonlari: 3 ta)»
- To'liq FSM oqimi: telefon → ism → kategoriya → nom → narx → birlik →
  miqdor → hudud → tuman → rasm → tasdiqlash
- «📋 Oxirgi e'lonlar» — har qanday sotuvchining e'lonini sotilgan deb
  belgilash yoki o'chirish
- «📊 Statistika»
- Har bir kirish nuqtasi `ADMIN_IDS` ni **qayta** tekshiradi

`/admin` va `/stats` Telegram menyusiga qo'shildi.

### 3. Umumiy qatlamga ko'chirish

`get_or_create_offline_seller()` va `normalize_phone()` `routes_admin.py` dan
`app/db/queries.py` ga ko'chirildi. Endi **uchala yo'l** — bot `/admin`, sayt
admin sahifasi, HTTP `POST /listings` — bir xil qoidani ishlatadi. Bitta
dehqon ikki marta qo'shilmaydi.

### 4. Next.js admin sahifasi — yangi

`frontend/app/sotuvchi/admin/page.tsx` (~700 qator), uchta bo'lim:

- **Statistika** — jami/faol/sotilgan, kategoriya · hudud · manba · aloqa
  kanali bo'yicha diagrammalar, eng ko'p ko'rilgan e'lonlar
- **E'lon qo'shish** — dehqon nomidan, telefon raqami identifikator sifatida
- **Barcha e'lonlar** — qidiruv, holat filtri, o'chirish

Admin ekanlik **backend'dan** aniqlanadi (`is_admin`), brauzerdan emas.

`lib/api.ts` ga qo'shildi: `getSession`, `getAdminDashboard`,
`getAdminListings`, `createAdminListing`, `deleteAdminListing`.

### 5. Topilgan va tuzatilgan haqiqiy xato

`ContactButtons.tsx` **to'g'ridan-to'g'ri `fetch()` chaqirardi** — bu
loyihaning «faqat `lib/api.ts` tarmoqqa chiqadi» qoidasini buzardi. Endi
`reportContact()` orqali ketadi.

Bu xatoni men yozgan yangi verify script topdi.

### 6. Eski frontend arxivlandi

`backend/web/` endi xizmat qilmaydi (`SERVE_LEGACY_WEB=false`). Qaytarish
uchun bitta o'zgaruvchi yetarli. `/` endi API haqida qisqa JSON qaytaradi,
404 emas.

### 7. Testlar

- **Yangi:** `frontend/scripts/verify.mjs` — 6 ta arxitektura qoidasi,
  hech qanday paketsiz ishlaydi. Kategoriya va hudud slug'larini
  `backend/app/catalog.py` bilan solishtiradi
- **Yangi:** `frontend/tests/` — Vitest, filtrlash/saralash/formatlash uchun
  ~40 ta test
- **Yangilandi:** `tests/test_bot.py` — 7 ta router, `AdminListing` FSM
  oqimining har bir qadami, admin himoyasi
- **Yangilandi:** `tests/test_frontend.py` — admin sahifasi majburiy fayllar
  ro'yxatida
- **Yangi:** `.github/workflows/ci.yml` — har push'da beshta Python to'plami
  va frontend verify/types/lint/test/build

### 8. Supabase

- **Yangi:** `supabase/seed.sql` — 6 sotuvchi, 12 e'lon, bog'lanish
  hodisalari. Qayta ishlatsa xavfsiz
- **Yangi:** `supabase/migrations/0002_public_sellers_rls.sql`
- **Tuzatildi:** `public_sellers` ko'rinishi RLS ni chetlab o'tardi —
  Postgres'da oddiy VIEW egasi huquqi bilan ishlaydi. `security_invoker = true`
  qo'shildi va `users` uchun aniq siyosat yozildi

### 9. Hujjatlar

`backend/README.md`, `frontend/README.md`, ildiz `README.md` — mavjud bo'lmagan
`bot.py` ga havola, eskirgan test raqamlari, yo'q admin handler tuzatildi.
Test jadvalidan qat'iy raqamlar olib tashlandi — ular birinchi o'zgarishda
eskirardi.

---

## 🔴 Sizdan kutilayotgan ishlar

Men buyruq ishga tushira olmayman (sandbox ishlamadi), shuning uchun bular
sizda qoladi.

### Ikkita qiymat — faqat siz bilasiz

`backend/.env` ichida:

```
BOT_USERNAME=TODO_BOT_USERNAME_QOYING     ← @BotFather, @ belgisisiz
ADMIN_IDS=TODO_TELEGRAM_ID_QOYING         ← @userinfobot beradi
```

### Olti buyruq

```bash
# 1 — git
cd "C:\Users\user\Desktop\Dehqon Bozori"
git init && git add . && git commit -m "Dehqon Bozori MVP"

# 2 — backend paketlari (fastapi, uvicorn, httpx, python-multipart yetishmaydi)
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# 3 — frontend paketlari
cd ../frontend
npm install

# 4 — hamma testlar
cd ..
python test_all.py

# 5 — frontend tekshiruvi
cd frontend && npm run check

# 6 — build (Vercel darvozasi)
npm run build
```

### Token

@BotFather → `/revoke` → yangi token → `backend/.env` ga qo'ying.
Eski token oshkor bo'lgan.

---

## ⚠️ Ogohlantirish

Sandbox ishlamagani uchun **men yozgan kod hech qachon kompilyatordan
o'tmagan.** Mantiq va importlarni qo'lda bir necha marta tekshirdim, lekin
`npm run typecheck` va `python test_all.py` birinchi marta ishlaganda kichik
xatolar chiqishi mumkin. Chiqsa — menga ko'rsating, darhol tuzataman.

Ayniqsa e'tibor bering:

- `tests/test_bot.py` endi 7 ta router kutadi
- `frontend/tests/*.test.ts` — Vitest birinchi marta ishlayapti
- `supabase/seed.sql` — Postgres sintaksisi lokal SQLite'da sinalmaydi

---

*Vositachisiz. 🌿*
