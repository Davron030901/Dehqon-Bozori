import { describe, expect, it } from 'vitest';

import {
  applyFilters,
  computeFacets,
  filtersToParams,
  listingBody,
  mapListing,
} from '@/lib/api';
import { demoListings } from '@/lib/demo';

const API_LISTING = {
  id: 7,
  title: 'Asal',
  category: 'honey',
  category_label: 'Мёд и пчеловодство',
  category_emoji: '🍯',
  description: null,
  price: 90000,
  unit: 'liter',
  unit_label: 'литр',
  quantity: '40 litr',
  region: 'jizzakh',
  region_label: 'Джизак',
  district: 'zomin',
  district_label: 'Zomin',
  photo: null,
  phone: '+998901234567',
  telegram_username: 'asalchi',
  whatsapp: null,
  status: 'active',
  views: 12,
  harvest_date: '2026-08-01',
  is_new_today: true,
  created_at: '2026-08-01T07:00:00Z',
  seller: { id: -3, full_name: null, username: null, phone: '+998901234567', region: 'jizzakh', village: null },
  contacts_count: null,
};

describe('mapListing', () => {
  it('keeps the server’s localised labels', () => {
    const l = mapListing(API_LISTING, 'ru');
    expect(l).toMatchObject({
      id: '7',
      category: 'honey',
      categoryLabel: 'Мёд и пчеловодство',
      unit: 'liter',
      unitLabel: 'литр',
      regionLabel: 'Джизак',
      districtLabel: 'Zomin',
      isSoldOut: false,
      isNewToday: true,
    });
    expect(l.seller?.fullName).toBe('Dehqon');
    expect(l.contactsCount).toBeUndefined();
  });

  it('files an unknown category under "other" instead of crashing', () => {
    const l = mapListing({ ...API_LISTING, category: 'spaceships', category_label: '' }, 'uz');
    expect(l.category).toBe('other');
    expect(l.categoryLabel).toBe('Boshqa');
  });

  it('marks sold listings', () => {
    expect(mapListing({ ...API_LISTING, status: 'sold' }).isSoldOut).toBe(true);
  });
});

describe('filtersToParams', () => {
  it('sends only real filters, and the language', () => {
    const p = filtersToParams({ query: ' asal ', category: 'honey', sort: 'cheapest' }, 2, 20, 'ru');
    expect(p.get('q')).toBe('asal');
    expect(p.get('category')).toBe('honey');
    expect(p.get('sort')).toBe('price_asc');
    expect(p.get('page')).toBe('2');
    expect(p.get('lang')).toBe('ru');
    expect(p.has('region')).toBe(false);
  });

  it('never sends a district without its region', () => {
    expect(filtersToParams({ district: 'urgut' }).has('district')).toBe(false);
    expect(filtersToParams({ region: 'samarkand', district: 'urgut' }).get('district')).toBe('urgut');
  });

  it('treats "all" as no category', () => {
    expect(filtersToParams({ category: 'all' }).has('category')).toBe(false);
  });
});

describe('listingBody', () => {
  it('stores the quantity as text with its unit, in the chosen language', () => {
    expect(listingBody({ quantity: '40', unit: 'liter' }, 'uz').quantity).toBe('40 litr');
    expect(listingBody({ quantity: '40', unit: 'liter' }, 'ru').quantity).toBe('40 литр');
  });

  it('keeps a free-text quantity exactly as the seller wrote it', () => {
    expect(listingBody({ quantity: '3 tonna', unit: 'kg' }).quantity).toBe('3 tonna');
    expect(listingBody({ quantity: '500-600 kg', unit: 'kg' }).quantity).toBe('500-600 kg');
    expect(listingBody({ quantity: 'ko‘p', unit: 'kg' }).quantity).toBe('ko‘p');
    expect(listingBody({ quantity: '  ', unit: 'kg' }).quantity).toBeNull();
  });

  it('does not touch the quantity when the edit leaves it out', () => {
    expect('quantity' in listingBody({ price: 9000, unit: 'kg' })).toBe(false);
  });

  it('clears optional fields with null and strips the @', () => {
    expect(listingBody({ district: '', telegramUsername: '@ali', description: ' ' })).toEqual({
      district: null,
      telegram_username: 'ali',
      description: null,
    });
  });

  it('passes the archived Telegram photo id along', () => {
    expect(listingBody({ photoUrl: '/media/uploads/a.jpg', photoFileId: 'AgAC' })).toEqual({
      photo_url: '/media/uploads/a.jpg',
      photo_file_id: 'AgAC',
    });
  });
});

describe('demo mode', () => {
  it('filters and sorts like the API', () => {
    const honey = applyFilters(demoListings, { category: 'honey' });
    expect(honey.every((l) => l.category === 'honey')).toBe(true);
    const cheapest = applyFilters(demoListings, { sort: 'cheapest' }).map((l) => l.price);
    expect(cheapest).toEqual([...cheapest].sort((a, b) => a - b));
  });

  it('hides sold listings from the feed', () => {
    expect(applyFilters(demoListings, {}).some((l) => l.isSoldOut)).toBe(false);
  });

  it('counts facets over active listings only', () => {
    const facets = computeFacets(demoListings);
    expect(facets.total).toBe(demoListings.filter((l) => !l.isSoldOut).length);
    expect(facets.categories.honey).toBe(1);
  });
});
