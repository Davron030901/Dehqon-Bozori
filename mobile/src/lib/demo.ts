/**
 * Demo listings for the no-backend mode (EXPO_PUBLIC_API_URL empty).
 *
 * Lets the app be opened in Expo Go and looked at before any server exists —
 * with a banner on screen saying the produce is not real.
 */
import { CATEGORIES, REGIONS, UNITS } from './catalog';
import { districtLabel } from './districts';
import type { CategoryKey, Listing, UnitKey } from './types';

function daysAgo(days: number, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function isoDay(days: number): string {
  return daysAgo(days).slice(0, 10);
}

let seq = 0;
function demo(
  productName: string,
  category: CategoryKey,
  price: number,
  unit: UnitKey,
  quantity: string,
  region: string,
  district: string,
  seller: { id: string; fullName: string; phone: string; telegramUsername?: string },
  extra: Partial<Listing> = {},
): Listing {
  seq += 1;
  const createdAt = extra.createdAt ?? daysAgo(seq % 5, 7 + seq);
  return {
    id: `demo-${seq}`,
    productName,
    category,
    categoryLabel: CATEGORIES[category].uz,
    categoryEmoji: CATEGORIES[category].emoji,
    price,
    unit,
    unitLabel: UNITS[unit].uz,
    quantity,
    region,
    regionLabel: REGIONS[region]?.uz ?? region,
    district,
    districtLabel: districtLabel(district),
    harvestDate: isoDay(seq % 3),
    phone: seller.phone,
    telegramUsername: seller.telegramUsername,
    isSoldOut: false,
    isNewToday: new Date(createdAt).toDateString() === new Date().toDateString(),
    views: 10 + ((seq * 37) % 90),
    createdAt,
    seller: { ...seller, region },
    ...extra,
  };
}

const ali = { id: 'demo-s1', fullName: 'Ali Rahimov', phone: '+998901234567', telegramUsername: 'dehqon_ali' };
const nodira = { id: 'demo-s2', fullName: 'Nodira Qodirova', phone: '+998917776655' };
const shavkat = { id: 'demo-s3', fullName: 'Shavkat Ergashev', phone: '+998945551122', telegramUsername: 'qovun_mirzachul' };
const bobur = { id: 'demo-s4', fullName: 'Bobur Karimov', phone: '+998935554433' };

export const demoListings: Listing[] = [
  demo('Yangi pomidor', 'vegetables', 8000, 'kg', '500 kg', 'samarkand', 'urgut', ali, {
    description: 'Bugun ertalab uzilgan, issiqxona pomidori. Yashiklarda tayyor.',
    whatsappNumber: '+998901234567',
  }),
  demo('Qora uzum (Husayni)', 'fruits', 15000, 'kg', '300 kg', 'samarkand', 'bulungur', ali),
  demo('Ko‘k piyoz va shivit', 'greens', 2000, 'bunch', "200 bog'", 'samarkand', 'toyloq', nodira),
  demo('Qovun (Mirzacho‘l)', 'melons', 6000, 'kg', '3 tonna', 'jizzakh', 'mirzachol', shavkat, {
    description: 'Shirin, yirik qovunlar. Ulgurji xaridorga chegirma bor.',
  }),
  demo('Tog‘ asali', 'honey', 90000, 'liter', '60 litr', 'jizzakh', 'zomin', shavkat),
  demo('Qatiq (uy sharoitida)', 'dairy', 12000, 'liter', '40 litr', 'samarkand', 'jomboy', nodira),
  demo('Yong‘oq mag‘zi', 'dried', 75000, 'kg', '120 kg', 'samarkand', 'payariq', bobur),
  demo('Bug‘doy (oq)', 'grains', 4500, 'kg', '2 tonna', 'samarkand', 'qoshrabot', bobur),
  demo('Uy tuxumi', 'meat', 1800, 'piece', '500 dona', 'bukhara', 'gijduvon', bobur),
  demo('Olma ko‘chati', 'seedlings', 25000, 'piece', '150 dona', 'fergana', 'quva', ali),
  demo('Kartoshka', 'vegetables', 5000, 'sack', '40 qop', 'jizzakh', 'gallaorol', shavkat),
  demo('Sarimsoq', 'vegetables', 22000, 'kg', '180 kg', 'kashkadarya', 'kitob', bobur, {
    isSoldOut: true,
  }),
];
