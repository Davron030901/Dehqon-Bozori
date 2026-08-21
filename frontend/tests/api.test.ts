import { describe, expect, it } from 'vitest';

import { applyFilters, isListedToday, toApiCategory } from '@/lib/api';
import type { Listing, ListingCategory } from '@/lib/types';

/** Minimal listing — only the fields the filter/sort logic actually reads. */
function listing(overrides: Partial<Listing> & { id: string }): Listing {
  return {
    productName: 'Pomidor',
    category: 'sabzavotlar',
    pricePerKg: 5000,
    quantityKg: 100,
    village: 'Chorbog’',
    district: 'Urgut',
    region: 'samarkand',
    harvestDate: '',
    isSoldOut: false,
    createdAt: '2026-07-01T10:00:00.000Z',
    ...overrides,
  };
}

const CATALOGUE: Listing[] = [
  listing({
    id: '1',
    productName: 'Pomidor',
    category: 'sabzavotlar',
    pricePerKg: 5000,
    region: 'samarkand',
    createdAt: '2026-07-01T10:00:00.000Z',
  }),
  listing({
    id: '2',
    productName: 'Uzum',
    category: 'mevalar',
    pricePerKg: 12000,
    region: 'samarkand',
    createdAt: '2026-07-05T10:00:00.000Z',
  }),
  listing({
    id: '3',
    productName: 'Bug’doy',
    category: 'don',
    pricePerKg: 3000,
    region: 'bukhara',
    createdAt: '2026-07-10T10:00:00.000Z',
    description: 'Toza, quruq bug’doy',
  }),
  listing({
    id: '4',
    productName: 'Olma',
    category: 'mevalar',
    pricePerKg: 8000,
    region: 'fergana',
    district: 'Quva',
    createdAt: '2026-07-03T10:00:00.000Z',
  }),
];

describe('applyFilters — category', () => {
  it('keeps only the chosen category', () => {
    const result = applyFilters(CATALOGUE, { category: 'mevalar' });
    expect(result.map((l) => l.id).sort()).toEqual(['2', '4']);
  });

  it('treats "all" as no category filter', () => {
    expect(applyFilters(CATALOGUE, { category: 'all' })).toHaveLength(4);
    expect(applyFilters(CATALOGUE, {})).toHaveLength(4);
  });
});

describe('applyFilters — region', () => {
  it('keeps only the chosen region', () => {
    const result = applyFilters(CATALOGUE, { region: 'samarkand' });
    expect(result.map((l) => l.id).sort()).toEqual(['1', '2']);
  });

  it('combines with the category filter rather than replacing it', () => {
    const result = applyFilters(CATALOGUE, { category: 'mevalar', region: 'fergana' });
    expect(result.map((l) => l.id)).toEqual(['4']);
  });
});

describe('applyFilters — district', () => {
  const withDistricts: Listing[] = [
    listing({ id: 'a', region: 'samarkand', district: 'urgut' }),
    listing({ id: 'b', region: 'samarkand', district: 'urgut' }),
    listing({ id: 'c', region: 'samarkand', district: 'jomboy' }),
    listing({ id: 'd', region: 'fergana', district: 'quva' }),
    // Posted before the district picker existed — free text, not a slug.
    listing({ id: 'e', region: 'samarkand', district: 'Chorbog’' }),
  ];

  it('matches the district slug exactly', () => {
    const result = applyFilters(withDistricts, { district: 'urgut' });
    expect(result.map((l) => l.id).sort()).toEqual(['a', 'b']);
  });

  it('treats "all" as no district filter', () => {
    expect(applyFilters(withDistricts, { district: 'all' })).toHaveLength(5);
  });

  it('narrows within a region rather than across regions', () => {
    const result = applyFilters(withDistricts, {
      region: 'samarkand',
      district: 'jomboy',
    });
    expect(result.map((l) => l.id)).toEqual(['c']);
  });

  it('still matches listings that stored free text', () => {
    const result = applyFilters(withDistricts, { district: 'Chorbog’' });
    expect(result.map((l) => l.id)).toEqual(['e']);
  });

  it('searches the readable district name, not just the stored slug', () => {
    const labelled = [
      listing({ id: 'x', district: 'urgut', districtLabel: 'Urgut' }),
      listing({ id: 'y', district: 'jomboy', districtLabel: 'Jomboy' }),
    ];
    expect(applyFilters(labelled, { query: 'urgut' }).map((l) => l.id)).toEqual(['x']);
  });
});

describe('applyFilters — search', () => {
  it('matches the product name case-insensitively', () => {
    expect(applyFilters(CATALOGUE, { query: 'UZUM' }).map((l) => l.id)).toEqual(['2']);
  });

  it('also searches the description and the district', () => {
    expect(applyFilters(CATALOGUE, { query: 'quruq' }).map((l) => l.id)).toEqual(['3']);
    expect(applyFilters(CATALOGUE, { query: 'quva' }).map((l) => l.id)).toEqual(['4']);
  });

  it('ignores surrounding whitespace', () => {
    expect(applyFilters(CATALOGUE, { query: '  olma  ' }).map((l) => l.id)).toEqual(['4']);
  });

  it('returns nothing for a term no listing mentions', () => {
    expect(applyFilters(CATALOGUE, { query: 'banan' })).toHaveLength(0);
  });
});

describe('applyFilters — sorting', () => {
  it('newest first by default', () => {
    expect(applyFilters(CATALOGUE, {}).map((l) => l.id)).toEqual(['3', '2', '4', '1']);
  });

  it('cheapest first when asked', () => {
    expect(applyFilters(CATALOGUE, { sort: 'cheapest' }).map((l) => l.id)).toEqual([
      '3',
      '1',
      '4',
      '2',
    ]);
  });

  it('"nearest" puts the home region first, then falls back to newest', () => {
    // No GPS in Phase 1 — "nearest" means "same region", Samarkand by default.
    const result = applyFilters(CATALOGUE, { sort: 'nearest' });
    expect(result.slice(0, 2).map((l) => l.id)).toEqual(['2', '1']);
    expect(result.slice(2).map((l) => l.id)).toEqual(['3', '4']);
  });

  it('honours an explicitly selected region as "home"', () => {
    const result = applyFilters(CATALOGUE, { region: 'all', sort: 'nearest' });
    expect(result.slice(0, 2).map((l) => l.id)).toEqual(['2', '1']);
  });

  it('does not mutate the array it was given', () => {
    const original = [...CATALOGUE];
    applyFilters(CATALOGUE, { sort: 'cheapest' });
    expect(CATALOGUE).toEqual(original);
  });
});

describe('isListedToday', () => {
  it('is true for a timestamp from today', () => {
    expect(isListedToday(new Date().toISOString())).toBe(true);
  });

  it('is false for yesterday and for last year', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(isListedToday(yesterday.toISOString())).toBe(false);
    expect(isListedToday('2020-01-01T00:00:00.000Z')).toBe(false);
  });

  it('is false rather than throwing on junk input', () => {
    expect(isListedToday('')).toBe(false);
    expect(isListedToday('kecha')).toBe(false);
  });
});

describe('toApiCategory', () => {
  it('maps every UI category to a slug the backend catalogue knows', () => {
    const pairs: [ListingCategory, string][] = [
      ['sabzavotlar', 'vegetables'],
      ['mevalar', 'fruits'],
      ['don', 'grains'],
      ['sut_mahsulotlari', 'dairy'],
      ['yongoqlar', 'dried'],
      ['boshqa', 'other'],
    ];
    for (const [ui, api] of pairs) expect(toApiCategory(ui)).toBe(api);
  });

  it('falls back to "other" rather than sending an unknown slug', () => {
    expect(toApiCategory('nonsense' as ListingCategory)).toBe('other');
  });
});
