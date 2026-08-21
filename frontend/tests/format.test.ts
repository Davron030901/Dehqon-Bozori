import { describe, expect, it } from 'vitest';

import {
  formatDate,
  formatPrice,
  isValidPhone,
  telHref,
  telegramHref,
  whatsappHref,
} from '@/lib/format';

describe('formatPrice', () => {
  it('groups thousands with a space, as Uzbek prices are written', () => {
    expect(formatPrice(8000)).toBe('8 000');
    expect(formatPrice(2500)).toBe('2 500');
    expect(formatPrice(1250000)).toBe('1 250 000');
  });

  it('leaves small numbers alone', () => {
    expect(formatPrice(0)).toBe('0');
    expect(formatPrice(999)).toBe('999');
  });

  it('rounds rather than showing a fractional so’m', () => {
    expect(formatPrice(8000.4)).toBe('8 000');
    expect(formatPrice(8000.6)).toBe('8 001');
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
    expect(telHref('(90) 123-45-67')).toBe('tel:+901234567');
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
