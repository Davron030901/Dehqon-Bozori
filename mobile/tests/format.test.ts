import { describe, expect, it } from 'vitest';

import {
  formatDate,
  formatPrice,
  isValidPhone,
  isoDay,
  quantityNumber,
  telHref,
  telegramHref,
  whatsappHref,
} from '@/lib/format';
import { dictionary } from '@/lib/i18n';

const NBSP = ' ';

describe('formatPrice', () => {
  it('groups thousands with a no-break space', () => {
    expect(formatPrice(8000)).toBe(`8${NBSP}000`);
    expect(formatPrice(1250000)).toBe(`1${NBSP}250${NBSP}000`);
    expect(formatPrice(999)).toBe('999');
  });

  it('rounds, and never prints NaN at a buyer', () => {
    expect(formatPrice(8000.6)).toBe(`8${NBSP}001`);
    expect(formatPrice(Number.NaN)).toBe('—');
  });
});

describe('formatDate', () => {
  it('writes the month in the chosen language', () => {
    expect(formatDate('2026-07-26', dictionary('uz').months)).toBe('26 iyul 2026');
    expect(formatDate('2026-07-26', dictionary('ru').months)).toBe('26 июля 2026');
  });

  it('keeps a bare date on its own day in every timezone', () => {
    expect(formatDate('2026-01-01', dictionary('uz').months)).toBe('1 yanvar 2026');
  });

  it('returns a dash for junk', () => {
    expect(formatDate(undefined, dictionary('uz').months)).toBe('—');
    expect(formatDate('kecha', dictionary('uz').months)).toBe('—');
  });
});

describe('isoDay', () => {
  it('counts back in calendar days', () => {
    const now = new Date(2026, 2, 1, 10); // 1 March
    expect(isoDay(0, now)).toBe('2026-03-01');
    expect(isoDay(1, now)).toBe('2026-02-28');
  });
});

describe('contact links', () => {
  it('adds +998 to a 9-digit Uzbek number, like the backend does', () => {
    expect(telHref('90 123 45 67')).toBe('tel:+998901234567');
    expect(telHref('+998 90 123-45-67')).toBe('tel:+998901234567');
    expect(whatsappHref('901234567')).toBe('https://wa.me/998901234567');
  });

  it('tolerates a leading @ on Telegram usernames', () => {
    expect(telegramHref('@dehqon_ali')).toBe('https://t.me/dehqon_ali');
  });

  it('validates phone length loosely', () => {
    expect(isValidPhone('+998901234567')).toBe(true);
    expect(isValidPhone('12345')).toBe(false);
  });
});

describe('quantityNumber', () => {
  it('reads the number out of free text', () => {
    expect(quantityNumber('500 kg')).toBe(500);
    expect(quantityNumber('1,5 tonna')).toBe(1.5);
    expect(quantityNumber('ko‘p')).toBeUndefined();
  });
});
