/** Small formatting helpers, shared by cards, detail pages and the cabinet. */

/**
 * 8000 -> "8 000". Uzbek convention: space as the thousands separator.
 *
 * The space is a NO-BREAK space (U+00A0), written as an escape because the
 * character itself is invisible in an editor: a plain space would let a narrow
 * card wrap "8" and "000" onto separate lines.
 */
export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
}

/** "2026-07-26T09:00:00Z" -> "26-iyul, 2026" */
const MONTHS_UZ = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

export function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.getDate()}-${MONTHS_UZ[date.getMonth()]}, ${date.getFullYear()}`;
}

/**
 * Digits with the country code. A 9-digit number is an Uzbek mobile written
 * the way people say it ("90 123 45 67") and gets 998 — the backend's
 * normalize_phone rule. Without it the link dialled +90…, which is Turkey.
 */
function internationalDigits(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  return digits.length === 9 ? `998${digits}` : digits;
}

/** Turns any phone shape into a tel: href. */
export function telHref(phone: string): string {
  return `tel:+${internationalDigits(phone)}`;
}

export function whatsappHref(number: string): string {
  return `https://wa.me/${internationalDigits(number)}`;
}

export function telegramHref(username: string): string {
  return `https://t.me/${username.replace(/^@/, '')}`;
}

/** Loose validation — Uzbek mobile numbers are 9 digits after the +998. */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[^\d]/g, '');
  return digits.length >= 9 && digits.length <= 15;
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

/**
 * The quantity as the edit form should show it. "500 kg" that the site wrote
 * for a kg listing becomes "500", so changing the unit relabels it ("500
 * litr"); anything else ("3 tonna", the bot's bare "500") is shown as written.
 */
export function editableQuantity(raw: string | undefined | null, unitLabels: string[]): string {
  const text = (raw ?? '').trim();
  const match = text.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  return match && unitLabels.includes(match[2]) ? match[1] : text;
}
