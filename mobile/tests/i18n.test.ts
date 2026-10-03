import { describe, expect, it } from 'vitest';

import { CATEGORIES, REGIONS, UNITS } from '@/lib/catalog';
import { demoListings } from '@/lib/demo';
import { DISTRICT_TO_REGION } from '@/lib/districts';
import { DICTIONARIES } from '@/lib/i18n';

function keys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe('translations', () => {
  it('Uzbek and Russian have exactly the same keys', () => {
    expect(keys(DICTIONARIES.ru).sort()).toEqual(keys(DICTIONARIES.uz).sort());
  });

  it('no string is left empty in either language', () => {
    for (const lang of ['uz', 'ru'] as const) {
      const walk = (value: unknown): void => {
        if (typeof value === 'string') expect(value.trim().length).toBeGreaterThan(0);
        else if (typeof value === 'function') expect(String(value(1, 2))).not.toBe('');
        else if (value && typeof value === 'object') Object.values(value).forEach(walk);
      };
      walk(DICTIONARIES[lang]);
    }
  });

  it('has twelve month names in each language', () => {
    expect(DICTIONARIES.uz.months).toHaveLength(12);
    expect(DICTIONARIES.ru.months).toHaveLength(12);
  });
});

describe('catalogue', () => {
  it('has the eleven categories, seven units and fourteen regions of the bot', () => {
    expect(Object.keys(CATEGORIES)).toHaveLength(11);
    expect(Object.keys(UNITS)).toHaveLength(7);
    expect(Object.keys(REGIONS)).toHaveLength(14);
  });

  it('every label exists in both languages', () => {
    for (const table of [CATEGORIES, UNITS, REGIONS]) {
      for (const item of Object.values(table)) {
        expect(item.uz).toBeTruthy();
        expect(item.ru).toBeTruthy();
      }
    }
  });

  it('demo listings use real districts of their own region', () => {
    for (const l of demoListings) {
      expect(DISTRICT_TO_REGION[l.district], l.district).toBe(l.region);
    }
  });
});
