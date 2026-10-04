/** Formatting helpers. Pure functions — no React Native imports, so vitest can run them. */
import type { Dictionary } from './i18n';

/**
 * 8000 -> "8 000". Uzbek and Russian both group thousands with a space; a
 * NO-BREAK space, so "8" and "000" never land on different lines of a card.
 */
export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** "2026-07-26" / ISO timestamp -> "26 iyul 2026" (or "26 июля 2026"). */
export function formatDate(iso: string | undefined | null, months: Dictionary['months']): string {
  if (!iso) return '—';
  // A bare date is a calendar day, not a moment — parse it as local noon so
  // no timezone can move it to the day before.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

/** YYYY-MM-DD for "today minus n days", in the phone's own timezone. */
export function isoDay(daysAgo = 0, now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function digits(value: string | undefined | null): string {
  return (value ?? '').replace(/\D/g, '');
}

/** Uzbek mobile numbers are 9 digits after +998; anything 9–15 digits is dialable. */
export function isValidPhone(phone: string): boolean {
  const n = digits(phone).length;
  return n >= 9 && n <= 15;
}

/** "90 123 45 67" -> "tel:+998901234567" — the same rule as the backend. */
export function telHref(phone: string): string {
  let d = digits(phone);
  if (d.length === 9) d = `998${d}`;
  return `tel:+${d}`;
}

export function whatsappHref(phone: string): string {
  let d = digits(phone);
  if (d.length === 9) d = `998${d}`;
  return `https://wa.me/${d}`;
}

export function telegramHref(username: string): string {
  return `https://t.me/${username.trim().replace(/^@/, '')}`;
}

/** "Ali Rahimov" -> "A" — the avatar letter when there is no photo. */
export function initial(name: string | undefined): string {
  return (name ?? '').trim().charAt(0).toUpperCase() || '🌿';
}

/**
 * What a seller types as a price -> so'm, the way the bot reads it.
 *
 * "8000", "8 000", "8'000", "8,000" and "8.000" are all eight thousand — in
 * Uzbekistan every one of those is how somebody writes it. Only a single
 * separator followed by one or two digits is a decimal ("8,5"), so a price
 * saved with kopecks survives an edit. Anything else -> NaN.
 */
export function parsePrice(raw: string): number {
  const compact = raw.replace(/[\s  '’‘`]/g, '');
  if (/^\d+[.,]\d{1,2}$/.test(compact)) return Number(compact.replace(',', '.'));
  const whole = compact.replace(/[.,]/g, '');
  return /^\d+$/.test(whole) ? Number(whole) : Number.NaN;
}

/**
 * The quantity as it is stored: free text, as in the bot ("3 tonna",
 * "500-600 kg", "ko'p"). A bare number gets the unit so it still reads
 * "500 kg" on a card; anything else is kept exactly as written.
 */
export function quantityText(raw: string | undefined | null, unitLabel: string): string | null {
  const text = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (!text) return null;
  return /^\d+([.,]\d+)?$/.test(text) ? `${text} ${unitLabel}`.trim() : text;
}
