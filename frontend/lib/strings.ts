/**
 * Every user-facing string in one place.
 *
 * Uzbek (Latin) is the product language. Nothing here is hard-coded into a
 * component, so adding Russian later is a matter of duplicating this object
 * and picking one at the root — no component changes required. That is why
 * `strings` is exported through a `t` accessor shape rather than as loose
 * consts.
 */

import type { CategoryKey, ReportReason, SortKey, UnitKey } from './types';

export const strings = {
  brand: 'Dehqon Bozori',
  tagline: 'Dehqondan to’g’ridan-to’g’ri xaridorga',

  nav: {
    home: 'Bosh sahifa',
    sell: 'E’lon berish',
    sellShort: 'E’lon',
    cabinet: 'Kabinet',
    register: 'Ro’yxatdan o’tish',
    favorites: 'Saqlanganlar',
    admin: 'Admin',
  },

  home: {
    heroTitle: 'Vositachisiz. To’g’ridan-to’g’ri dehqondan.',
    heroSubtitle:
      'Qishloq oilalari hosilini shu yerda e’lon qiladi. Xaridor — bozor savdogari, do’kon yoki oshxona — ro’yxatdan o’tmasdan sotuvchiga to’g’ridan-to’g’ri bog’lanadi.',
    statListings: 'faol e’lon',
    statSellers: 'dehqon',
    statRegions: 'hudud',
    resultsCount: (n: number) => `${n} ta e’lon topildi`,
    loadMore: 'Yana ko’rsatish',
    loadingMore: 'Yuklanmoqda…',
    loadMoreFailed: 'Yuklab bo’lmadi. Internetni tekshirib, yana bosing.',
    sellCtaTitle: 'Hosilingiz bormi? O’zingiz soting.',
    sellCtaBody: 'Bir daqiqada e’lon joylang — xaridor sizga to’g’ridan-to’g’ri qo’ng’iroq qiladi.',
    appCta: 'Android ilovani yuklab olish',
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
    cheapest: 'Arzonroq',
    expensive: 'Qimmatroq',
    popular: 'Ko’p ko’rilgan',
  } satisfies Record<SortKey, string>,

  card: {
    currency: 'so’m',
    listedToday: 'Bugun joylandi',
    soldOut: 'Sotilgan',
    noPhoto: 'Rasm yo’q',
    save: 'Saqlash',
    unsave: 'Saqlanganlardan olib tashlash',
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
    unit: 'O’lchov birligi',
    sellerPage: 'Sotuvchining barcha e’lonlari',
    share: 'Ulashish',
    linkCopied: 'Havola nusxalandi',
    report: 'Shikoyat qilish',
  },

  report: {
    title: 'E’lon ustidan shikoyat',
    reason: 'Sabab',
    note: 'Izoh',
    notePlaceholder: 'Nima noto’g’ri? (ixtiyoriy)',
    submit: 'Yuborish',
    sending: 'Yuborilmoqda…',
    cancel: 'Bekor qilish',
    thanks: 'Rahmat! Shikoyatingiz admin’ga yuborildi.',
  },

  favorites: {
    title: 'Saqlangan e’lonlar',
    subtitle:
      'Yoqqan e’lonlarni ♥ bilan saqlang — ular shu qurilmada turadi. Telegram orqali kirsangiz, botdagi ⭐ saralanganlar bilan birlashadi.',
    empty: 'Hali hech narsa saqlanmagan.',
    emptyCta: 'E’lonlarni ko’rish',
    synced: 'Telegram hisobingiz bilan sinxronlangan',
  },

  sellerPage: {
    title: 'Sotuvchi',
    activeListings: 'faol e’lon',
    totalListings: 'jami e’lon',
    memberSince: 'Platformada',
    listings: 'E’lonlari',
    empty: 'Hozircha faol e’lon yo’q.',
    notFoundTitle: 'Sotuvchi topilmadi',
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

  editListing: {
    title: 'E’lonni tahrirlash',
    subtitle: 'O’zgartiring va saqlang — e’lon saytda ham, botda ham darhol yangilanadi.',
    submit: 'Saqlash',
    saved: 'O’zgarishlar saqlandi!',
    notYours: 'Bu e’lon sizniki emas yoki topilmadi.',
    back: 'Kabinetga qaytish',
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
    price: 'Narxi (so’m)',
    unit: 'Nima uchun',
    pricePer: (unit: string) => `1 ${unit} uchun narx`,
    quantity: 'Mavjud miqdor',
    quantityPlaceholder: '500 yoki «3 tonna»',
    removePhoto: 'Rasmni olib tashlash',
    loginFirst:
      'E’lon joylash uchun Telegram orqali kiring — bu bir marta, 10 soniya. E’lonlaringiz bot va ilova bilan umumiy bo’ladi.',
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
    edit: 'Tahrirlash',
    contacts: (n: number) => `${n} ta xaridor bog’landi`,
    logout: 'Chiqish',
    profile: 'Profil',
    signedInAs: 'Hisob',
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
    tabReports: 'Shikoyatlar',
    statOpenReports: 'Ochiq shikoyat',
    reportsEmpty: 'Ochiq shikoyat yo’q. 🌿',
    resolve: 'Hal qilindi',
    markSold: 'Sotilgan deb belgilash',
    listingGone: 'E’lon o’chirilgan',
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

  login: {
    button: 'Telegram orqali kirish',
    matchHint: 'Shu raqamni eslab qoling — bot uni tanlashni so’raydi:',
    openTelegram: 'Telegram’ni ochish',
    returnHere: 'Botda raqamni tanlagach, shu sahifaga qayting — kirish o’zi davom etadi.',
    expired: 'Muddat tugadi. Qaytadan urinib ko’ring.',
    refused:
      'Kirish rad etildi: botda boshqa raqam tanlandi. Agar bu siz bo’lsangiz, qaytadan urinib ko’ring.',
    failed: 'Xatolik yuz berdi.',
    // Split around <code>NEXT_PUBLIC_API_URL</code>.
    noServerBefore: 'Server ulanmagan. Kirish uchun',
    noServerAfter: 'ni sozlang — shu paytgacha formalar brauzeringizda saqlanadi.',
  },

  footer: {
    about:
      'Dehqon Bozori — Samarqand viloyati qishloqlaridan boshlangan, vositachisiz bozor.',
    openBot: 'Telegram botni ochish',
    rights: 'Barcha huquqlar himoyalangan.',
  },

  errors: {
    retry: 'Qayta urinish',
  },

  loading: 'Yuklanmoqda…',
} as const;

/**
 * Labels + emoji for the eleven categories — the bot's own catalogue.
 *
 * ⚠️ Keys and emoji MUST match `backend/app/catalog.py`, because the same
 * listing is shown in the Telegram bot, on this site and in the mobile app, and
 * a tomato that is 🥕 in one place and 🥬 in another looks like two different
 * listings to the person who posted it. `npm run verify` and the contract suite
 * compare the two files and fail if they drift.
 *
 * `label` is the full name (forms, detail pages); `short` fits on a chip.
 */
export const categoryLabels: Record<CategoryKey, { label: string; short: string; emoji: string }> = {
  vegetables: { label: 'Sabzavotlar', short: 'Sabzavot', emoji: '🥕' },
  fruits: { label: 'Mevalar', short: 'Meva', emoji: '🍎' },
  melons: { label: 'Poliz mahsulotlari', short: 'Poliz', emoji: '🍉' },
  greens: { label: 'Ko’katlar', short: 'Ko’kat', emoji: '🌿' },
  grains: { label: 'Don va dukkaklilar', short: 'Don', emoji: '🌾' },
  dried: { label: 'Quruq meva va yong’oq', short: 'Quruq meva', emoji: '🥜' },
  dairy: { label: 'Sut mahsulotlari', short: 'Sut', emoji: '🥛' },
  meat: { label: 'Go’sht va parranda', short: 'Go’sht', emoji: '🍖' },
  honey: { label: 'Asal va asalarichilik', short: 'Asal', emoji: '🍯' },
  seedlings: { label: 'Urug’ va ko’chat', short: 'Ko’chat', emoji: '🌱' },
  other: { label: 'Boshqa', short: 'Boshqa', emoji: '📦' },
};

/** Chip order: what a bazaar trader looks for first. */
export const categoryOrder: CategoryKey[] = [
  'vegetables',
  'fruits',
  'melons',
  'greens',
  'grains',
  'dried',
  'dairy',
  'meat',
  'honey',
  'seedlings',
  'other',
];

export function categoryLabel(key: string): string {
  return categoryLabels[key as CategoryKey]?.label ?? key;
}

export function categoryEmoji(key: string): string {
  return categoryLabels[key as CategoryKey]?.emoji ?? '📦';
}

/**
 * The seven selling units — the bot's `UNITS`. Honey is sold by the litre,
 * eggs by the piece, greens by the bunch; "so’m/kg" on everything was a lie.
 */
export const unitLabels: Record<UnitKey, string> = {
  kg: 'kg',
  ton: 'tonna',
  piece: 'dona',
  bunch: 'bog’',
  sack: 'qop',
  box: 'yashik',
  liter: 'litr',
};

export const unitOrder: UnitKey[] = ['kg', 'ton', 'piece', 'bunch', 'sack', 'box', 'liter'];

export function unitLabel(key: string): string {
  return unitLabels[key as UnitKey] ?? key;
}

/** Why a buyer can flag a listing. Keys match the backend's report reasons. */
export const reportReasons: Record<ReportReason, string> = {
  spam: 'Spam yoki reklama',
  fraud: 'Firibgarlik',
  wrong_price: 'Narx noto’g’ri',
  sold: 'Allaqachon sotilgan',
  other: 'Boshqa sabab',
};

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
