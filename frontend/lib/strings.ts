/**
 * Every user-facing string in one place.
 *
 * Uzbek (Latin) is the product language. Nothing here is hard-coded into a
 * component, so adding Russian later is a matter of duplicating this object
 * and picking one at the root — no component changes required. That is why
 * `strings` is exported through a `t` accessor shape rather than as loose
 * consts.
 */

import type { Category, ListingCategory, SortKey } from './types';

export const strings = {
  brand: 'Dehqon Bozori',
  tagline: 'Dehqondan to’g’ridan-to’g’ri xaridorga',

  nav: {
    home: 'Bosh sahifa',
    sell: 'E’lon berish',
    cabinet: 'Kabinet',
    register: 'Ro’yxatdan o’tish',
  },

  home: {
    heroTitle: 'Vositachisiz. To’g’ridan-to’g’ri dehqondan.',
    heroSubtitle:
      'Qishloq oilalari hosilini shu yerda e’lon qiladi. Xaridor — bozor savdogari, do’kon yoki oshxona — ro’yxatdan o’tmasdan sotuvchiga to’g’ridan-to’g’ri bog’lanadi.',
    statListings: 'faol e’lon',
    statSellers: 'dehqon',
    statRegions: 'hudud',
    resultsCount: (n: number) => `${n} ta e’lon topildi`,
    emptyTitle: 'Hech narsa topilmadi',
    emptyBody: 'Filtrlarni o’zgartirib ko’ring yoki birinchi bo’lib e’lon bering.',
    demoNotice:
      'Namuna ma’lumotlari ko’rsatilmoqda — server ulanmagan. NEXT_PUBLIC_API_URL ni sozlang.',
  },

  search: {
    placeholder: 'Mahsulot qidiring: pomidor, uzum, asal…',
    submit: 'Qidirish',
    clear: 'Tozalash',
  },

  filters: {
    allCategories: 'Barchasi',
    allRegions: 'Barcha hududlar',
    allDistricts: 'Barcha tumanlar',
    region: 'Hudud',
    district: 'Tuman',
    sort: 'Saralash',
    reset: 'Filtrlarni tozalash',
  },

  sort: {
    newest: 'Eng yangi',
    cheapest: 'Arzon narx',
    nearest: 'Yaqin hudud',
  } satisfies Record<SortKey, string>,

  card: {
    perKg: 'so’m/kg',
    listedToday: 'Bugun joylandi',
    soldOut: 'Sotilgan',
    noPhoto: 'Rasm yo’q',
  },

  detail: {
    back: 'Orqaga',
    price: 'Narxi',
    quantity: 'Mavjud miqdor',
    harvestDate: 'Yig’im sanasi',
    location: 'Manzil',
    category: 'Kategoriya',
    seller: 'Sotuvchi',
    posted: 'Joylangan',
    views: 'ko’rildi',
    description: 'Izoh',
    contactTitle: 'Sotuvchi bilan bog’laning',
    contactNote:
      'Narx va yetkazib berishni sotuvchi bilan to’g’ridan-to’g’ri kelishasiz. Dehqon Bozori vositachilik qilmaydi va haq olmaydi.',
    noContact: 'Sotuvchi aloqa ma’lumotini qoldirmagan.',
    notFoundTitle: 'E’lon topilmadi',
    notFoundBody: 'Bu e’lon o’chirilgan yoki manzil noto’g’ri.',
    similar: 'O’xshash e’lonlar',
    kg: 'kg',
  },

  contact: {
    call: 'Qo’ng’iroq qilish',
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
  },

  register: {
    title: 'Sotuvchi bo’lib ro’yxatdan o’ting',
    subtitle:
      'Faqat telefon raqamingiz kerak. Ro’yxatdan o’tgach mahsulotlaringizni e’lon qila olasiz.',
    fullName: 'Ismingiz',
    fullNamePlaceholder: 'Masalan: Ali Rahimov',
    phone: 'Telefon raqam',
    village: 'Qishloq',
    villagePlaceholder: 'Masalan: Chorbog’',
    district: 'Tuman / shahar',
    // The district is a list now, so there is nothing to place-hold. Kept as
    // the empty option's label instead.
    districtChoose: 'Tanlang',
    region: 'Viloyat',
    submit: 'Ro’yxatdan o’tish',
    submitting: 'Yuborilmoqda…',
    success: 'Ro’yxatdan o’tdingiz! Endi e’lon qo’shishingiz mumkin.',
    goAddListing: 'E’lon qo’shish',
    telegramHint:
      'Telegram bot orqali ham ro’yxatdan o’tsangiz bo’ladi — u yerda hammasi yozishmalar orqali bo’ladi.',
  },

  addListing: {
    title: 'Yangi e’lon',
    subtitle: 'Rasm qo’shsangiz, xaridorlar ancha ko’p bog’lanadi.',
    photo: 'Mahsulot rasmi',
    photoHint: 'Rasm tanlang (ixtiyoriy)',
    photoChange: 'Rasmni almashtirish',
    productName: 'Mahsulot nomi',
    productNamePlaceholder: 'Masalan: Yangi pomidor',
    category: 'Kategoriya',
    pricePerKg: 'Narxi (so’m/kg)',
    quantityKg: 'Miqdori (kg)',
    village: 'Qishloq',
    district: 'Tuman / shahar',
    region: 'Viloyat',
    harvestDate: 'Yig’im sanasi',
    description: 'Qo’shimcha izoh',
    descriptionPlaceholder: 'Masalan: bugun uzilgan, qadoqlangan.',
    contactsTitle: 'Aloqa ma’lumotlari',
    contactsHint: 'Kamida bittasini to’ldiring — xaridor shu orqali bog’lanadi.',
    phone: 'Telefon raqam',
    telegram: 'Telegram username',
    whatsapp: 'WhatsApp raqam',
    submit: 'E’lonni joylash',
    submitting: 'Saqlanmoqda…',
    success: 'E’lon joylandi!',
    viewListing: 'E’lonni ko’rish',
    addAnother: 'Yana e’lon qo’shish',
  },

  cabinet: {
    title: 'Mening e’lonlarim',
    subtitle: 'E’lonlaringizni boshqaring — sotilganini belgilang yoki o’chiring.',
    empty: 'Sizda hali e’lon yo’q.',
    emptyCta: 'Birinchi e’lonni qo’shish',
    markSold: 'Sotildi deb belgilash',
    markActive: 'Qayta faollashtirish',
    view: 'Ko’rish',
    delete: 'O’chirish',
    confirmDelete: (name: string) => `"${name}" e’lonini o’chirasizmi?`,
    unpublished: 'Yuborilmagan',
    loginTitle: 'Telegram orqali kiring',
    loginBody:
      'E’lonlaringizni bu yerda ko’rish uchun Telegram hisobingiz bilan kiring — bot bilan bir xil hisob.',
    active: 'Faol',
    sold: 'Sotilgan',
    totalListings: 'Jami e’lonlar',
    activeListings: 'Faol',
    views: 'Ko’rishlar',
    saving: 'Saqlanmoqda…',
  },

  admin: {
    title: 'Admin panel',
    subtitle:
      'Telefon qilgan dehqon uchun e’lon qo’shing — u botga kirmasa ham e’loni saytda chiqadi.',
    loginTitle: 'Telegram orqali kiring',
    loginBody:
      'Admin panel faqat ADMIN_IDS ro’yxatidagi Telegram hisoblari uchun ochiladi.',
    notAdminTitle: 'Sizda admin huquqi yo’q',
    notAdminBody:
      'Telegram ID’ingizni backend’dagi ADMIN_IDS ga qo’shing, keyin qaytadan kiring.',
    tabDashboard: 'Statistika',
    tabAdd: 'E’lon qo’shish',
    tabListings: 'Barcha e’lonlar',
    statListings: 'Jami e’lon',
    statActive: 'Faol',
    statSold: 'Sotilgan',
    statUsers: 'Foydalanuvchi',
    statContacts: 'Bog’lanish',
    statContactsWeek: 'Bu hafta bog’lanish',
    statListingsWeek: 'Bu hafta e’lon',
    byCategory: 'Kategoriya bo’yicha',
    byRegion: 'Hudud bo’yicha',
    bySource: 'Manba bo’yicha',
    byChannel: 'Aloqa kanali bo’yicha',
    topListings: 'Eng ko’p ko’rilgan',
    sellerSection: 'Dehqon ma’lumotlari',
    sellerHint:
      'Telefon raqam — sotuvchining shaxsi. Shu raqam bo’yicha eski sotuvchi topiladi yoki yangisi ochiladi, takrorlanmaydi.',
    sellerName: 'Dehqonning ismi',
    sellerNamePlaceholder: 'Masalan: Ali Rahimov',
    sellerPhone: 'Dehqonning telefon raqami',
    productSection: 'Mahsulot',
    submit: 'Dehqon nomidan joylash',
    submitting: 'Saqlanmoqda…',
    success: 'E’lon qo’shildi!',
    addAnother: 'Yana bitta qo’shish',
    searchPlaceholder: 'E’lonlar ichidan qidiring…',
    filterAll: 'Hammasi',
    filterActive: 'Faol',
    filterSold: 'Sotilgan',
    empty: 'E’lon topilmadi.',
    delete: 'O’chirish',
    confirmDelete: (name: string) => `"${name}" e’lonini butunlay o’chirasizmi?`,
    seller: 'Sotuvchi',
    source: 'Manba',
    reload: 'Yangilash',
  },

  form: {
    required: 'Majburiy maydon',
    invalidPhone: 'Telefon raqamni to’g’ri kiriting (masalan: +998 90 123 45 67)',
    invalidPrice: 'Narxni raqam bilan kiriting',
    minLength: (n: number) => `Kamida ${n} ta belgi kiriting`,
    atLeastOneContact: 'Kamida bitta aloqa usulini kiriting',
    optional: 'ixtiyoriy',
    genericError: 'Xatolik yuz berdi. Qaytadan urinib ko’ring.',
    offlineSaved:
      'Server ulanmagan — e’lon faqat shu brauzerda saqlandi. Server ulangach qaytadan yuboring.',
  },

  footer: {
    about:
      'Dehqon Bozori — Samarqand viloyati qishloqlaridan boshlangan, vositachisiz bozor.',
    openBot: 'Telegram botni ochish',
    rights: 'Barcha huquqlar himoyalangan.',
  },

  loading: 'Yuklanmoqda…',
} as const;

/**
 * Chip labels + emoji fallbacks for the category system.
 *
 * ⚠️ The emoji here MUST match `backend/app/catalog.py`, because the same
 * listing is shown in the Telegram bot and on this site, and a tomato that is
 * 🥕 in one place and 🥬 in the other looks like two different listings to the
 * person who posted it.
 *
 * The backend is the source of truth: the API returns `category_emoji` on every
 * listing and cards use that. This map is the fallback for demo data (which
 * never goes through the API) and for the category chips, which describe the
 * UI's five buckets rather than any one listing.
 *
 * `npm run verify` compares the two files and fails if they drift.
 */
export const categoryLabels: Record<ListingCategory, { label: string; emoji: string }> = {
  sabzavotlar: { label: 'Sabzavotlar', emoji: '🥕' },
  mevalar: { label: 'Mevalar', emoji: '🍎' },
  don: { label: 'Don', emoji: '🌾' },
  sut_mahsulotlari: { label: 'Sut mahsulotlari', emoji: '🥛' },
  yongoqlar: { label: 'Yong’oqlar', emoji: '🥜' },
  boshqa: { label: 'Boshqa', emoji: '📦' },
};

/** The five headline categories, in the order they appear as chips. */
export const primaryCategories: Category[] = [
  'sabzavotlar',
  'mevalar',
  'don',
  'sut_mahsulotlari',
  'yongoqlar',
];

/** The 14 regions of Uzbekistan, matching the backend's catalogue. */
export const regions: { key: string; label: string }[] = [
  { key: 'samarkand', label: 'Samarqand' },
  { key: 'andijan', label: 'Andijon' },
  { key: 'bukhara', label: 'Buxoro' },
  { key: 'fergana', label: 'Farg’ona' },
  { key: 'jizzakh', label: 'Jizzax' },
  { key: 'kashkadarya', label: 'Qashqadaryo' },
  { key: 'navoiy', label: 'Navoiy' },
  { key: 'namangan', label: 'Namangan' },
  { key: 'surkhandarya', label: 'Surxondaryo' },
  { key: 'syrdarya', label: 'Sirdaryo' },
  { key: 'tashkent_region', label: 'Toshkent viloyati' },
  { key: 'tashkent_city', label: 'Toshkent shahri' },
  { key: 'khorezm', label: 'Xorazm' },
  { key: 'karakalpakstan', label: 'Qoraqalpog’iston' },
];

export function regionLabel(key: string): string {
  return regions.find((r) => r.key === key)?.label ?? key;
}
