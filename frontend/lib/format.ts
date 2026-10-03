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

/** Turns any phone shape into a tel: href. */
export function telHref(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  return `tel:+${digits}`;
}

export function whatsappHref(number: string): string {
  return `https://wa.me/${number.replace(/[^\d]/g, '')}`;
}

export function telegramHref(username: string): string {
  return `https://t.me/${username.replace(/^@/, '')}`;
}

/** Loose validation — Uzbek mobile numbers are 9 digits after the +998. */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[^\d]/g, '');
  return digits.length >= 9 && digits.length <= 15;
}
