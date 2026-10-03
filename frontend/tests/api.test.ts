import { describe, expect, it } from 'vitest';

import {
  applyFilters,
  computeFacets,
  filtersFromSearch,
  filtersToApiParams,
  filtersToSearch,
  isListedToday,
  listingInputToApi,
  paginate,
  quantityNumber,
} from '@/lib/api';
import type { Listing } from '@/lib/types';

/** Minimal listing — only the fields the filter/sort logic actually reads. */
function listing(overrides: Partial<Listing> & { id: string }): Listing {
  return {
    productName: 'Pomidor',
    category: 'vegetables',
    price: 5000,
    unit: 'kg',
    unitLabel: 'kg',
    quantity: '100 kg',
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
    category: 'vegetables',
    price: 5000,
    region: 'samarkand',
    createdAt: '2026-07-01T10:00:00.000Z',
  }),
  listing({
    id: '2',
    productName: 'Uzum',
    category: 'fruits',
    price: 12000,
    region: 'samarkand',
    createdAt: '2026-07-05T10:00:00.000Z',
  }),
  listing({
    id: '3',
    productName: 'Bug’doy',
    category: 'grains',
    price: 3000,
    region: 'bukhara',
    createdAt: '2026-07-10T10:00:00.000Z',
    description: 'Toza, quruq bug’doy',
  }),
  listing({
    id: '4',
    productName: 'Olma',
    category: 'fruits',
    price: 8000,
    region: 'fergana',
    district: 'Quva',
    createdAt: '2026-07-03T10:00:00.000Z',
  }),
];

describe('applyFilters — category', () => {
  it('keeps only the chosen category', () => {
    const result = applyFilters(CATALOGUE, { category: 'fruits' });
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
    const result = applyFilters(CATALOGUE, { category: 'fruits', region: 'fergana' });
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

  it('most expensive first when asked', () => {
    expect(applyFilters(CATALOGUE, { sort: 'expensive' }).map((l) => l.id)).toEqual([
      '2',
      '4',
      '1',
      '3',
    ]);
  });

  it('most viewed first for "popular", newest breaking ties', () => {
    const viewed = [
      listing({ id: 'a', views: 3, createdAt: '2026-07-01T10:00:00.000Z' }),
      listing({ id: 'b', views: 50, createdAt: '2026-07-02T10:00:00.000Z' }),
      listing({ id: 'c', views: 3, createdAt: '2026-07-09T10:00:00.000Z' }),
    ];
    expect(applyFilters(viewed, { sort: 'popular' }).map((l) => l.id)).toEqual(['b', 'c', 'a']);
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

describe('filters <-> URL', () => {
  it('writes only what differs from the defaults', () => {
    expect(filtersToSearch({})).toBe('');
    expect(filtersToSearch({ category: 'all', region: 'all', sort: 'newest' })).toBe('');
    expect(filtersToSearch({ category: 'honey', sort: 'cheapest' })).toBe(
      '?category=honey&sort=cheapest',
    );
  });

  it('drops a district when no region is chosen', () => {
    expect(filtersToSearch({ district: 'urgut' })).toBe('');
    expect(filtersToSearch({ region: 'samarkand', district: 'urgut' })).toBe(
      '?region=samarkand&district=urgut',
    );
  });

  it('round-trips through the address bar', () => {
    const filters = {
      query: 'pomidor',
      category: 'vegetables' as const,
      region: 'samarkand',
      district: 'urgut',
      sort: 'popular' as const,
    };
    const search = Object.fromEntries(new URLSearchParams(filtersToSearch(filters)));
    expect(filtersFromSearch(search)).toEqual(filters);
  });

  it('ignores junk in the URL instead of sending it to the API', () => {
    const parsed = filtersFromSearch({
      category: 'spaceships',
      sort: 'random',
      region: '<script>',
      district: 'urgut',
    });
    expect(parsed).toEqual({
      query: '',
      category: 'all',
      region: 'all',
      // A district means nothing without a valid region.
      district: 'all',
      sort: 'newest',
    });
    expect(filtersToApiParams(parsed).has('district')).toBe(false);
  });

  it('maps sort keys onto the API vocabulary', () => {
    expect(filtersToApiParams({ sort: 'cheapest' }).get('sort')).toBe('price_asc');
    expect(filtersToApiParams({ sort: 'expensive' }).get('sort')).toBe('price_desc');
    expect(filtersToApiParams({ sort: 'popular' }).get('sort')).toBe('popular');
    expect(filtersToApiParams({}).get('sort')).toBe('new');
  });

  it('asks for the right page', () => {
    const params = filtersToApiParams({ query: ' asal ' }, 3, 24);
    expect(params.get('q')).toBe('asal');
    expect(params.get('page')).toBe('3');
    expect(params.get('per_page')).toBe('24');
  });
});

describe('computeFacets', () => {
  it('counts active listings per category and region', () => {
    const facets = computeFacets([...CATALOGUE, listing({ id: 's', isSoldOut: true })]);
    expect(facets.total).toBe(4);
    expect(facets.categories).toEqual({ vegetables: 1, fruits: 2, grains: 1 });
    expect(facets.regions).toEqual({ samarkand: 2, bukhara: 1, fergana: 1 });
  });

  it('scopes district counts to the chosen region', () => {
    expect(computeFacets(CATALOGUE, 'fergana').districts).toEqual({ Quva: 1 });
  });
});

describe('paginate', () => {
  it('slices pages and reports how many there are', () => {
    const page = paginate(CATALOGUE, 2, 3);
    expect(page.items.map((l) => l.id)).toEqual(['4']);
    expect(page).toMatchObject({ total: 4, page: 2, pages: 2 });
  });

  it('never reports zero pages', () => {
    expect(paginate([], 1, 24).pages).toBe(1);
  });
});

describe('quantityNumber', () => {
  it('pulls the number out of free text', () => {
    expect(quantityNumber('500 kg')).toBe(500);
    expect(quantityNumber('1,5 tonna')).toBe(1.5);
    expect(quantityNumber('40 litr')).toBe(40);
  });

  it('returns undefined when there is no usable number', () => {
    expect(quantityNumber(null)).toBeUndefined();
    expect(quantityNumber('ko‘p')).toBeUndefined();
    expect(quantityNumber('0 kg')).toBeUndefined();
  });
});

describe('listingInputToApi', () => {
  it('writes the quantity with its unit, as the bot does', () => {
    const body = listingInputToApi({
      productName: ' Asal ',
      category: 'honey',
      price: 90000,
      unit: 'liter',
      quantity: 40,
      region: 'jizzakh',
      district: 'zomin',
      telegramUsername: '@asalchi',
    });
    expect(body).toMatchObject({
      title: 'Asal',
      category: 'honey',
      unit: 'liter',
      quantity: '40 litr',
      district: 'zomin',
      telegram_username: 'asalchi',
    });
  });

  it('sends null to clear an optional field, and omits what was not given', () => {
    const body = listingInputToApi({ district: '', description: '  ' });
    expect(body).toEqual({ district: null, description: null });
  });

  it('passes the archived Telegram photo id along with the upload URL', () => {
    const body = listingInputToApi({ photoUrl: '/media/uploads/a.jpg', photoFileId: 'AgAC' });
    expect(body).toEqual({ photo_url: '/media/uploads/a.jpg', photo_file_id: 'AgAC' });
  });
});
