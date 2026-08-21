import { describe, expect, it } from 'vitest';

import {
  DISTRICTS,
  DISTRICT_COUNT,
  DISTRICT_TO_REGION,
  districtLabel,
  districtsOf,
  isValidDistrict,
} from '@/lib/districts';
import { regions } from '@/lib/strings';

/**
 * lib/districts.ts is generated from backend/app/districts.py, so these do not
 * re-check the data itself — tests/test_contract.py compares the two files.
 * What they check is that the generated shape behaves the way the forms and
 * filters assume it does.
 */

describe('district catalogue', () => {
  it('covers all 14 regions of Uzbekistan', () => {
    expect(Object.keys(DISTRICTS)).toHaveLength(14);
  });

  it('covers every region the UI offers as a filter', () => {
    for (const region of regions) {
      expect(districtsOf(region.key).length).toBeGreaterThan(0);
    }
  });

  it('holds every district and city', () => {
    const total = Object.values(DISTRICTS).reduce((sum, list) => sum + list.length, 0);
    expect(total).toBe(DISTRICT_COUNT);
    expect(total).toBeGreaterThanOrEqual(150);
  });

  it('never repeats a key across regions', () => {
    const keys = Object.values(DISTRICTS).flatMap((list) => list.map((d) => d.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('lists cities before districts, so the nearest bazaar comes first', () => {
    for (const [region, list] of Object.entries(DISTRICTS)) {
      const firstDistrict = list.findIndex((d) => d.type === 'district');
      if (firstDistrict === -1) continue;
      const after = list.slice(firstDistrict);
      expect(after.every((d) => d.type === 'district'), region).toBe(true);
    }
  });

  it('indexes every key back to its region', () => {
    const keys = Object.values(DISTRICTS).flatMap((list) => list.map((d) => d.key));
    expect(Object.keys(DISTRICT_TO_REGION)).toHaveLength(keys.length);
    expect(DISTRICT_TO_REGION.urgut).toBe('samarkand');
    expect(DISTRICT_TO_REGION.quva).toBe('fergana');
  });
});

describe('districtsOf', () => {
  it('returns nothing for "all", so the filter stays hidden', () => {
    // 205 districts in one dropdown is a wall, not a filter.
    expect(districtsOf('all')).toEqual([]);
  });

  it('returns nothing for an unknown or missing region', () => {
    expect(districtsOf('atlantis')).toEqual([]);
    expect(districtsOf(undefined)).toEqual([]);
    expect(districtsOf(null)).toEqual([]);
  });

  it('includes the regional capital as a city', () => {
    const samarkand = districtsOf('samarkand');
    const capital = samarkand.find((d) => d.key === 'samarkand_city');
    expect(capital?.type).toBe('city');
    expect(capital?.label).toBe('Samarqand shahri');
  });

  it('covers the 12 districts of Tashkent city', () => {
    expect(districtsOf('tashkent_city')).toHaveLength(12);
  });
});

describe('districtLabel', () => {
  it('resolves a known slug', () => {
    expect(districtLabel('urgut')).toBe('Urgut');
    expect(districtLabel('samarkand_city')).toBe('Samarqand shahri');
  });

  it('passes free text through, for listings older than the picker', () => {
    expect(districtLabel('Chorbog’')).toBe('Chorbog’');
  });

  it('is empty rather than "undefined" when there is nothing to show', () => {
    expect(districtLabel(undefined)).toBe('');
    expect(districtLabel(null)).toBe('');
    expect(districtLabel('')).toBe('');
  });
});

describe('isValidDistrict', () => {
  it('accepts a district in its own region', () => {
    expect(isValidDistrict('urgut', 'samarkand')).toBe(true);
  });

  it('rejects a district from a different region', () => {
    // The bug this prevents: a stale form submitting Urgut under Fergana.
    expect(isValidDistrict('urgut', 'fergana')).toBe(false);
  });

  it('accepts any known district when no region is given', () => {
    expect(isValidDistrict('urgut')).toBe(true);
    expect(isValidDistrict('urgut', 'all')).toBe(true);
  });

  it('rejects free text and unknown slugs', () => {
    expect(isValidDistrict('Chorbog’', 'samarkand')).toBe(false);
    expect(isValidDistrict('atlantis')).toBe(false);
  });
});
