/**
 * Districts and cities of Uzbekistan, by region.
 *
 * ⚠️ GENERATED FILE — do not edit by hand.
 *
 * Source: backend/app/districts.py
 * Regenerate: npm run gen:districts
 * Verified by: npm run verify (fails if this file is stale)
 *
 * 14 regions, 205 districts and cities.
 *
 * Place names are Uzbek only. Translating 175 of them by guesswork would
 * show a Russian-speaking trader the wrong name, which is worse than
 * showing them the Uzbek one.
 */

export interface District {
  key: string;
  label: string;
  /** 'city' sorts first — a grower names their nearest bazaar. */
  type: 'city' | 'district';
}

export const DISTRICTS: Record<string, District[]> = {
  karakalpakstan: [
    { key: 'nukus_city', label: 'Nukus shahri', type: 'city' },
    { key: 'amudaryo', label: 'Amudaryo', type: 'district' },
    { key: 'beruniy', label: 'Beruniy', type: 'district' },
    { key: 'bozatov', label: 'Bo\'zatov', type: 'district' },
    { key: 'chimboy', label: 'Chimboy', type: 'district' },
    { key: 'ellikqala', label: 'Ellikqal\'a', type: 'district' },
    { key: 'kegeyli', label: 'Kegeyli', type: 'district' },
    { key: 'moynoq', label: 'Mo\'ynoq', type: 'district' },
    { key: 'nukus_district', label: 'Nukus tumani', type: 'district' },
    { key: 'qanlikol', label: 'Qanliko\'l', type: 'district' },
    { key: 'qongirot', label: 'Qo\'ng\'irot', type: 'district' },
    { key: 'qoraozak', label: 'Qorao\'zak', type: 'district' },
    { key: 'shumanay', label: 'Shumanay', type: 'district' },
    { key: 'taxiatosh', label: 'Taxiatosh', type: 'district' },
    { key: 'taxtakopir', label: 'Taxtako\'pir', type: 'district' },
    { key: 'tortkol', label: 'To\'rtko\'l', type: 'district' },
    { key: 'xojayli', label: 'Xo\'jayli', type: 'district' },
  ],
  khorezm: [
    { key: 'urganch_city', label: 'Urganch shahri', type: 'city' },
    { key: 'xiva_city', label: 'Xiva shahri', type: 'city' },
    { key: 'bogot', label: 'Bog\'ot', type: 'district' },
    { key: 'gurlan', label: 'Gurlan', type: 'district' },
    { key: 'hazorasp', label: 'Hazorasp', type: 'district' },
    { key: 'khiva_district', label: 'Xiva tumani', type: 'district' },
    { key: 'qoshkopir', label: 'Qo\'shko\'pir', type: 'district' },
    { key: 'shovot', label: 'Shovot', type: 'district' },
    { key: 'tuproqqala', label: 'Tuproqqal\'a', type: 'district' },
    { key: 'urganch_district', label: 'Urganch tumani', type: 'district' },
    { key: 'xonqa', label: 'Xonqa', type: 'district' },
    { key: 'yangiariq', label: 'Yangiariq', type: 'district' },
    { key: 'yangibozor_kh', label: 'Yangibozor', type: 'district' },
  ],
  navoiy: [
    { key: 'navoiy_city', label: 'Navoiy shahri', type: 'city' },
    { key: 'zarafshon_city', label: 'Zarafshon shahri', type: 'city' },
    { key: 'gozgon_city', label: 'G\'ozg\'on shahri', type: 'city' },
    { key: 'karmana', label: 'Karmana', type: 'district' },
    { key: 'konimex', label: 'Konimex', type: 'district' },
    { key: 'navbahor', label: 'Navbahor', type: 'district' },
    { key: 'nurota', label: 'Nurota', type: 'district' },
    { key: 'qiziltepa', label: 'Qiziltepa', type: 'district' },
    { key: 'tomdi', label: 'Tomdi', type: 'district' },
    { key: 'uchquduq', label: 'Uchquduq', type: 'district' },
    { key: 'xatirchi', label: 'Xatirchi', type: 'district' },
  ],
  bukhara: [
    { key: 'bukhara_city', label: 'Buxoro shahri', type: 'city' },
    { key: 'kogon_city', label: 'Kogon shahri', type: 'city' },
    { key: 'bukhara_district', label: 'Buxoro tumani', type: 'district' },
    { key: 'gijduvon', label: 'G\'ijduvon', type: 'district' },
    { key: 'jondor', label: 'Jondor', type: 'district' },
    { key: 'kogon_district', label: 'Kogon tumani', type: 'district' },
    { key: 'olot', label: 'Olot', type: 'district' },
    { key: 'peshku', label: 'Peshku', type: 'district' },
    { key: 'qorakol', label: 'Qorako\'l', type: 'district' },
    { key: 'qorovulbozor', label: 'Qorovulbozor', type: 'district' },
    { key: 'romitan', label: 'Romitan', type: 'district' },
    { key: 'shofirkon', label: 'Shofirkon', type: 'district' },
    { key: 'vobkent', label: 'Vobkent', type: 'district' },
  ],
  samarkand: [
    { key: 'samarkand_city', label: 'Samarqand shahri', type: 'city' },
    { key: 'kattaqorgon_city', label: 'Kattaqo\'rg\'on shahri', type: 'city' },
    { key: 'bulungur', label: 'Bulung\'ur', type: 'district' },
    { key: 'ishtixon', label: 'Ishtixon', type: 'district' },
    { key: 'jomboy', label: 'Jomboy', type: 'district' },
    { key: 'kattaqorgon_district', label: 'Kattaqo\'rg\'on tumani', type: 'district' },
    { key: 'narpay', label: 'Narpay', type: 'district' },
    { key: 'nurobod', label: 'Nurobod', type: 'district' },
    { key: 'oqdaryo', label: 'Oqdaryo', type: 'district' },
    { key: 'pastdargom', label: 'Pastdarg\'om', type: 'district' },
    { key: 'paxtachi', label: 'Paxtachi', type: 'district' },
    { key: 'payariq', label: 'Payariq', type: 'district' },
    { key: 'qoshrabot', label: 'Qo\'shrabot', type: 'district' },
    { key: 'samarkand_district', label: 'Samarqand tumani', type: 'district' },
    { key: 'toyloq', label: 'Toyloq', type: 'district' },
    { key: 'urgut', label: 'Urgut', type: 'district' },
  ],
  kashkadarya: [
    { key: 'qarshi_city', label: 'Qarshi shahri', type: 'city' },
    { key: 'shahrisabz_city', label: 'Shahrisabz shahri', type: 'city' },
    { key: 'chiroqchi', label: 'Chiroqchi', type: 'district' },
    { key: 'dehqonobod', label: 'Dehqonobod', type: 'district' },
    { key: 'guzor', label: 'G\'uzor', type: 'district' },
    { key: 'kasbi', label: 'Kasbi', type: 'district' },
    { key: 'kitob', label: 'Kitob', type: 'district' },
    { key: 'koson', label: 'Koson', type: 'district' },
    { key: 'mirishkor', label: 'Mirishkor', type: 'district' },
    { key: 'muborak', label: 'Muborak', type: 'district' },
    { key: 'nishon', label: 'Nishon', type: 'district' },
    { key: 'qamashi', label: 'Qamashi', type: 'district' },
    { key: 'qarshi_district', label: 'Qarshi tumani', type: 'district' },
    { key: 'shahrisabz_district', label: 'Shahrisabz tumani', type: 'district' },
    { key: 'yakkabog', label: 'Yakkabog\'', type: 'district' },
  ],
  surkhandarya: [
    { key: 'termiz_city', label: 'Termiz shahri', type: 'city' },
    { key: 'angor', label: 'Angor', type: 'district' },
    { key: 'bandixon', label: 'Bandixon', type: 'district' },
    { key: 'boysun', label: 'Boysun', type: 'district' },
    { key: 'denov', label: 'Denov', type: 'district' },
    { key: 'jarqorgon', label: 'Jarqo\'rg\'on', type: 'district' },
    { key: 'muzrabot', label: 'Muzrabot', type: 'district' },
    { key: 'oltinsoy', label: 'Oltinsoy', type: 'district' },
    { key: 'qiziriq', label: 'Qiziriq', type: 'district' },
    { key: 'qumqorgon', label: 'Qumqo\'rg\'on', type: 'district' },
    { key: 'sariosiyo', label: 'Sariosiyo', type: 'district' },
    { key: 'sherobod', label: 'Sherobod', type: 'district' },
    { key: 'shorchi', label: 'Sho\'rchi', type: 'district' },
    { key: 'termiz_district', label: 'Termiz tumani', type: 'district' },
    { key: 'uzun', label: 'Uzun', type: 'district' },
  ],
  jizzakh: [
    { key: 'jizzakh_city', label: 'Jizzax shahri', type: 'city' },
    { key: 'arnasoy', label: 'Arnasoy', type: 'district' },
    { key: 'baxmal', label: 'Baxmal', type: 'district' },
    { key: 'dostlik', label: 'Do\'stlik', type: 'district' },
    { key: 'forish', label: 'Forish', type: 'district' },
    { key: 'gallaorol', label: 'G\'allaorol', type: 'district' },
    { key: 'mirzachol', label: 'Mirzacho\'l', type: 'district' },
    { key: 'paxtakor', label: 'Paxtakor', type: 'district' },
    { key: 'sharof_rashidov', label: 'Sharof Rashidov', type: 'district' },
    { key: 'yangiobod', label: 'Yangiobod', type: 'district' },
    { key: 'zafarobod', label: 'Zafarobod', type: 'district' },
    { key: 'zarbdor', label: 'Zarbdor', type: 'district' },
    { key: 'zomin', label: 'Zomin', type: 'district' },
  ],
  syrdarya: [
    { key: 'guliston_city', label: 'Guliston shahri', type: 'city' },
    { key: 'shirin_city', label: 'Shirin shahri', type: 'city' },
    { key: 'yangiyer_city', label: 'Yangiyer shahri', type: 'city' },
    { key: 'boyovut', label: 'Boyovut', type: 'district' },
    { key: 'guliston_district', label: 'Guliston tumani', type: 'district' },
    { key: 'mirzaobod', label: 'Mirzaobod', type: 'district' },
    { key: 'oqoltin', label: 'Oqoltin', type: 'district' },
    { key: 'sardoba', label: 'Sardoba', type: 'district' },
    { key: 'sayxunobod', label: 'Sayxunobod', type: 'district' },
    { key: 'syrdarya_district', label: 'Sirdaryo tumani', type: 'district' },
    { key: 'xovos', label: 'Xovos', type: 'district' },
  ],
  tashkent_region: [
    { key: 'nurafshon_city', label: 'Nurafshon shahri', type: 'city' },
    { key: 'angren_city', label: 'Angren shahri', type: 'city' },
    { key: 'bekobod_city', label: 'Bekobod shahri', type: 'city' },
    { key: 'chirchiq_city', label: 'Chirchiq shahri', type: 'city' },
    { key: 'olmaliq_city', label: 'Olmaliq shahri', type: 'city' },
    { key: 'ohangaron_city', label: 'Ohangaron shahri', type: 'city' },
    { key: 'yangiyol_city', label: 'Yangiyo\'l shahri', type: 'city' },
    { key: 'bekobod_district', label: 'Bekobod tumani', type: 'district' },
    { key: 'boka', label: 'Bo\'ka', type: 'district' },
    { key: 'bostonliq', label: 'Bo\'stonliq', type: 'district' },
    { key: 'chinoz', label: 'Chinoz', type: 'district' },
    { key: 'ohangaron_district', label: 'Ohangaron tumani', type: 'district' },
    { key: 'oqqorgon', label: 'Oqqo\'rg\'on', type: 'district' },
    { key: 'ortachirchiq', label: 'O\'rtachirchiq', type: 'district' },
    { key: 'parkent', label: 'Parkent', type: 'district' },
    { key: 'piskent', label: 'Piskent', type: 'district' },
    { key: 'qibray', label: 'Qibray', type: 'district' },
    { key: 'quyichirchiq', label: 'Quyichirchiq', type: 'district' },
    { key: 'tashkent_district', label: 'Toshkent tumani', type: 'district' },
    { key: 'yangiyol_district', label: 'Yangiyo\'l tumani', type: 'district' },
    { key: 'yuqorichirchiq', label: 'Yuqorichirchiq', type: 'district' },
    { key: 'zangiota', label: 'Zangiota', type: 'district' },
  ],
  namangan: [
    { key: 'namangan_city', label: 'Namangan shahri', type: 'city' },
    { key: 'chortoq', label: 'Chortoq', type: 'district' },
    { key: 'chust', label: 'Chust', type: 'district' },
    { key: 'kosonsoy', label: 'Kosonsoy', type: 'district' },
    { key: 'mingbuloq', label: 'Mingbuloq', type: 'district' },
    { key: 'namangan_district', label: 'Namangan tumani', type: 'district' },
    { key: 'norin', label: 'Norin', type: 'district' },
    { key: 'pop', label: 'Pop', type: 'district' },
    { key: 'toraqorgon', label: 'To\'raqo\'rg\'on', type: 'district' },
    { key: 'uchqorgon', label: 'Uchqo\'rg\'on', type: 'district' },
    { key: 'uychi', label: 'Uychi', type: 'district' },
    { key: 'yangiqorgon', label: 'Yangiqo\'rg\'on', type: 'district' },
  ],
  fergana: [
    { key: 'fergana_city', label: 'Farg\'ona shahri', type: 'city' },
    { key: 'margilon_city', label: 'Marg\'ilon shahri', type: 'city' },
    { key: 'qoqon_city', label: 'Qo\'qon shahri', type: 'city' },
    { key: 'quvasoy_city', label: 'Quvasoy shahri', type: 'city' },
    { key: 'bagdod', label: 'Bag\'dod', type: 'district' },
    { key: 'beshariq', label: 'Beshariq', type: 'district' },
    { key: 'buvayda', label: 'Buvayda', type: 'district' },
    { key: 'dangara', label: 'Dang\'ara', type: 'district' },
    { key: 'fergana_district', label: 'Farg\'ona tumani', type: 'district' },
    { key: 'furqat', label: 'Furqat', type: 'district' },
    { key: 'oltiariq', label: 'Oltiariq', type: 'district' },
    { key: 'qoshtepa', label: 'Qo\'shtepa', type: 'district' },
    { key: 'quva', label: 'Quva', type: 'district' },
    { key: 'rishton', label: 'Rishton', type: 'district' },
    { key: 'sox', label: 'So\'x', type: 'district' },
    { key: 'toshloq', label: 'Toshloq', type: 'district' },
    { key: 'uchkoprik', label: 'Uchko\'prik', type: 'district' },
    { key: 'uzbekistan_district', label: 'O\'zbekiston tumani', type: 'district' },
    { key: 'yozyovon', label: 'Yozyovon', type: 'district' },
  ],
  andijan: [
    { key: 'andijan_city', label: 'Andijon shahri', type: 'city' },
    { key: 'xonobod_city', label: 'Xonobod shahri', type: 'city' },
    { key: 'andijan_district', label: 'Andijon tumani', type: 'district' },
    { key: 'asaka', label: 'Asaka', type: 'district' },
    { key: 'baliqchi', label: 'Baliqchi', type: 'district' },
    { key: 'boston', label: 'Bo\'ston', type: 'district' },
    { key: 'buloqboshi', label: 'Buloqboshi', type: 'district' },
    { key: 'izboskan', label: 'Izboskan', type: 'district' },
    { key: 'jalaquduq', label: 'Jalaquduq', type: 'district' },
    { key: 'marhamat', label: 'Marhamat', type: 'district' },
    { key: 'oltinkol', label: 'Oltinko\'l', type: 'district' },
    { key: 'paxtaobod', label: 'Paxtaobod', type: 'district' },
    { key: 'qorgontepa', label: 'Qo\'rg\'ontepa', type: 'district' },
    { key: 'shahrixon', label: 'Shahrixon', type: 'district' },
    { key: 'ulugnor', label: 'Ulug\'nor', type: 'district' },
    { key: 'xojaobod', label: 'Xo\'jaobod', type: 'district' },
  ],
  tashkent_city: [
    { key: 'bektemir', label: 'Bektemir', type: 'district' },
    { key: 'chilonzor', label: 'Chilonzor', type: 'district' },
    { key: 'mirobod', label: 'Mirobod', type: 'district' },
    { key: 'mirzo_ulugbek', label: 'Mirzo Ulug\'bek', type: 'district' },
    { key: 'olmazor', label: 'Olmazor', type: 'district' },
    { key: 'sergeli', label: 'Sergeli', type: 'district' },
    { key: 'shayxontohur', label: 'Shayxontohur', type: 'district' },
    { key: 'uchtepa', label: 'Uchtepa', type: 'district' },
    { key: 'yakkasaroy', label: 'Yakkasaroy', type: 'district' },
    { key: 'yangihayot', label: 'Yangihayot', type: 'district' },
    { key: 'yashnobod', label: 'Yashnobod', type: 'district' },
    { key: 'yunusobod', label: 'Yunusobod', type: 'district' },
  ],
};

/** District slug -> region slug. Guards against filing Urgut under Khorezm. */
export const DISTRICT_TO_REGION: Record<string, string> = Object.fromEntries(
  Object.entries(DISTRICTS).flatMap(([region, items]) =>
    items.map((item) => [item.key, region]),
  ),
);

const LABELS: Record<string, string> = Object.fromEntries(
  Object.values(DISTRICTS).flatMap((items) => items.map((i) => [i.key, i.label])),
);

/** Districts and cities of one region, or an empty list for an unknown one. */
export function districtsOf(region: string | undefined | null): District[] {
  if (!region || region === 'all') return [];
  return DISTRICTS[region] ?? [];
}

/**
 * Slug -> readable name.
 *
 * Listings posted before the district picker existed hold free text rather
 * than a slug, so anything unrecognised is returned as-is instead of being
 * blanked out.
 */
export function districtLabel(key: string | undefined | null): string {
  if (!key) return '';
  return LABELS[key] ?? key;
}

export function isValidDistrict(key: string, region?: string): boolean {
  const actual = DISTRICT_TO_REGION[key];
  if (!actual) return false;
  return !region || region === 'all' || actual === region;
}

export const DISTRICT_COUNT = 205;
