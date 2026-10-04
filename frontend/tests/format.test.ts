import { describe, expect, it } from 'vitest';

import {
  formatDate,
  formatPrice,
  isValidPhone,
  editableQuantity,
  parsePrice,
  quantityText,
  telHref,
  telegramHref,
  whatsappHref,
} from '@/lib/format';

// formatPrice groups with a NO-BREAK space (U+00A0), not a plain one, so a
// price never wraps in the middle on a narrow phone screen ("8" / "000").
const NBSP = '\u00a0';

describe('formatPrice', () => {
  it('groups thousands with a space, as Uzbek prices are written', () => {
    expect(formatPrice(8000)).toBe(`8${NBSP}000`);
    expect(formatPrice(2500)).toBe(`2${NBSP}500`);
    expect(formatPrice(1250000)).toBe(`1${NBSP}250${NBSP}000`);
  });

  it('never uses a breakable space between digit groups', () => {
    expect(formatPrice(1250000)).not.toContain(' ');
  });

  it('leaves small numbers alone', () => {
    expect(formatPrice(0)).toBe('0');
    expect(formatPrice(999)).toBe('999');
  });

  it('rounds rather than showing a fractional so’m', () => {
    expect(formatPrice(8000.4)).toBe(`8${NBSP}000`);
    expect(formatPrice(8000.6)).toBe(`8${NBSP}001`);
  });

  it('degrades to a dash instead of printing NaN at a buyer', () => {
    expect(formatPrice(Number.NaN)).toBe('—');
    expect(formatPrice(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('formatDate', () => {
  // No trailing Z: JS parses these as local time, so the assertion holds in
  // every timezone instead of only in the one CI happens to run in.
  it('writes the month in Uzbek', () => {
    expect(formatDate('2026-07-26T09:00:00')).toBe('26-iyul, 2026');
    expect(formatDate('2026-01-03T00:00:00')).toBe('3-yanvar, 2026');
  });

  it('returns a dash for missing or unparseable input', () => {
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDate('kecha')).toBe('—');
  });
});

describe('contact links', () => {
  it('strips punctuation out of tel: hrefs', () => {
    expect(telHref('+998 90 123 45 67')).toBe('tel:+998901234567');
  });

  it('adds +998 to a number written without it, as the app and backend do', () => {
    // Not tel:+901234567 — that is a Turkish number.
    expect(telHref('(90) 123-45-67')).toBe('tel:+998901234567');
    expect(whatsappHref('90 123 45 67')).toBe('https://wa.me/998901234567');
  });

  it('builds wa.me links from digits only', () => {
    expect(whatsappHref('+998 90 123 45 67')).toBe('https://wa.me/998901234567');
  });

  it('tolerates a leading @ on Telegram usernames', () => {
    expect(telegramHref('@dehqon_ali')).toBe('https://t.me/dehqon_ali');
    expect(telegramHref('dehqon_ali')).toBe('https://t.me/dehqon_ali');
  });
});

describe('isValidPhone', () => {
  it('accepts Uzbek mobile numbers with or without the country code', () => {
    expect(isValidPhone('+998901234567')).toBe(true);
    expect(isValidPhone('901234567')).toBe(true);
    expect(isValidPhone('+998 90 123 45 67')).toBe(true);
  });

  it('rejects anything too short to dial', () => {
    expect(isValidPhone('12345')).toBe(false);
    expect(isValidPhone('')).toBe(false);
  });
});

describe('parsePrice', () => {
  it('reads every way a price is written in Uzbekistan, like the bot', () => {
    for (const raw of ['8000', '8 000', '8\u00a0000', "8'000", '8’000', '8,000', '8.000']) {
      expect(parsePrice(raw)).toBe(8000);
    }
    expect(parsePrice('1.500.000')).toBe(1_500_000);
  });

  it('keeps a real decimal, so an edit does not multiply the price', () => {
    expect(parsePrice('8000.5')).toBe(8000.5);
    expect(parsePrice('8,5')).toBe(8.5);
  });

  it('rejects text that is not a price', () => {
    expect(parsePrice('')).toBeNaN();
    expect(parsePrice('arzon')).toBeNaN();
    expect(parsePrice('-5')).toBeNaN();
  });
});

describe('quantityText', () => {
  it('adds the unit to a bare number and keeps free text as written', () => {
    expect(quantityText('500', 'kg')).toBe('500 kg');
    expect(quantityText('3 tonna', 'kg')).toBe('3 tonna');
    expect(quantityText('  2   mashina ', 'kg')).toBe('2 mashina');
    expect(quantityText('', 'kg')).toBeNull();
  });
});

describe('editableQuantity', () => {
  it('drops the unit the site added, so a new unit relabels the number', () => {
    expect(editableQuantity('500 kg', ['kg'])).toBe('500');
    expect(editableQuantity('1,5 kg', ['kg'])).toBe('1,5');
  });

  it('keeps everything else exactly as written', () => {
    expect(editableQuantity('3 tonna', ['kg'])).toBe('3 tonna');
    expect(editableQuantity('500', ['kg'])).toBe('500');
    expect(editableQuantity('500-600 kg', ['kg'])).toBe('500-600 kg');
    expect(editableQuantity('40 litr', ['kg'])).toBe('40 litr');
    expect(editableQuantity(undefined, ['kg'])).toBe('');
  });
});
