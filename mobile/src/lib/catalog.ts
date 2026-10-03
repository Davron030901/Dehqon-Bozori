/**
 * Categories, units and regions — `backend/app/catalog.py`, in TypeScript.
 *
 * Same slugs, same emoji, same Uzbek and Russian labels as the bot. The keys
 * are checked against the Python file by `npm run verify` and by the Python
 * contract suite, so this copy cannot quietly drift.
 */
import type { CategoryKey, Lang, UnitKey } from './types';

type Labelled = { uz: string; ru: string };

export const CATEGORIES: Record<CategoryKey, Labelled & { emoji: string }> = {
  vegetables: { uz: 'Sabzavotlar', ru: 'Овощи', emoji: '🥕' },
  fruits: { uz: 'Mevalar', ru: 'Фрукты', emoji: '🍎' },
  melons: { uz: "Poliz mahsulotlari", ru: 'Бахчевые', emoji: '🍉' },
  greens: { uz: "Ko'katlar", ru: 'Зелень', emoji: '🌿' },
  grains: { uz: 'Don va dukkaklilar', ru: 'Зерно и крупы', emoji: '🌾' },
  dried: { uz: "Quruq meva va yong'oq", ru: 'Сухофрукты и орехи', emoji: '🥜' },
  dairy: { uz: 'Sut mahsulotlari', ru: 'Молочные продукты', emoji: '🥛' },
  meat: { uz: "Go'sht va parranda", ru: 'Мясо и птица', emoji: '🍖' },
  honey: { uz: 'Asal va asalarichilik', ru: 'Мёд и пчеловодство', emoji: '🍯' },
  seedlings: { uz: "Urug' va ko'chat", ru: 'Семена и саженцы', emoji: '🌱' },
  other: { uz: 'Boshqa', ru: 'Прочее', emoji: '📦' },
};

export const CATEGORY_ORDER = Object.keys(CATEGORIES) as CategoryKey[];

export const UNITS: Record<UnitKey, Labelled> = {
  kg: { uz: 'kg', ru: 'кг' },
  ton: { uz: 'tonna', ru: 'тонна' },
  piece: { uz: 'dona', ru: 'шт' },
  bunch: { uz: "bog'", ru: 'пучок' },
  sack: { uz: 'qop', ru: 'мешок' },
  box: { uz: 'yashik', ru: 'ящик' },
  liter: { uz: 'litr', ru: 'литр' },
};

export const UNIT_ORDER = Object.keys(UNITS) as UnitKey[];

/** Samarkand first — that is where the project starts. */
export const REGIONS: Record<string, Labelled> = {
  samarkand: { uz: 'Samarqand', ru: 'Самарканд' },
  andijan: { uz: 'Andijon', ru: 'Андижан' },
  bukhara: { uz: 'Buxoro', ru: 'Бухара' },
  fergana: { uz: "Farg'ona", ru: 'Фергана' },
  jizzakh: { uz: 'Jizzax', ru: 'Джизак' },
  kashkadarya: { uz: 'Qashqadaryo', ru: 'Кашкадарья' },
  navoiy: { uz: 'Navoiy', ru: 'Навои' },
  namangan: { uz: 'Namangan', ru: 'Наманган' },
  surkhandarya: { uz: 'Surxondaryo', ru: 'Сурхандарья' },
  syrdarya: { uz: 'Sirdaryo', ru: 'Сырдарья' },
  tashkent_region: { uz: 'Toshkent viloyati', ru: 'Ташкентская область' },
  tashkent_city: { uz: 'Toshkent shahri', ru: 'город Ташкент' },
  khorezm: { uz: 'Xorazm', ru: 'Хорезм' },
  karakalpakstan: { uz: "Qoraqalpog'iston", ru: 'Каракалпакстан' },
};

export const REGION_ORDER = Object.keys(REGIONS);

export function isCategory(key: string): key is CategoryKey {
  return Object.prototype.hasOwnProperty.call(CATEGORIES, key);
}

export function isUnit(key: string): key is UnitKey {
  return Object.prototype.hasOwnProperty.call(UNITS, key);
}

export function categoryLabel(key: string, lang: Lang): string {
  return isCategory(key) ? CATEGORIES[key][lang] : key;
}

export function categoryEmoji(key: string): string {
  return isCategory(key) ? CATEGORIES[key].emoji : '📦';
}

export function unitLabel(key: string, lang: Lang): string {
  return isUnit(key) ? UNITS[key][lang] : key;
}

export function regionLabel(key: string | undefined, lang: Lang): string {
  if (!key) return '';
  return REGIONS[key]?.[lang] ?? key;
}
