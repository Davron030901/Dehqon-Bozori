'use client';

import { useMemo, useState } from 'react';

import CategoryChips, { type CategoryValue } from '@/components/CategoryChips';
import FilterBar from '@/components/FilterBar';
import ProductGrid from '@/components/ProductGrid';
import SearchBar from '@/components/SearchBar';
import { applyFilters } from '@/lib/api';
import { DISTRICT_TO_REGION, districtsOf } from '@/lib/districts';
import { regionLabel, strings } from '@/lib/strings';
import type { Listing, SortKey } from '@/lib/types';

/**
 * The interactive half of the homepage.
 *
 * Listings arrive already fetched from the server component, so the first
 * paint needs no JavaScript round-trip. Search, filter and sort then all run
 * locally — instant on a slow connection, and no extra requests.
 */
export default function HomeFeed({ listings }: { listings: Listing[] }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryValue>('all');
  const [region, setRegion] = useState<string>('all');
  const [district, setDistrict] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('newest');

  // Only offer regions that actually have listings, so no filter is a dead end.
  const availableRegions = useMemo(() => {
    const keys = Array.from(new Set(listings.map((l) => l.region)));
    return keys
      .map((key) => ({ key, label: regionLabel(key) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'uz'));
  }, [listings]);

  /**
   * Districts of the selected region that actually have something for sale.
   *
   * Deliberately empty while "all regions" is selected — 205 districts in one
   * dropdown is not a filter, and the buyer would have no way to tell which of
   * them has produce today.
   *
   * Ordered the way districts.ts orders them (cities first), not
   * alphabetically: a trader looking for "Samarqand shahri" should not have to
   * scroll past thirteen villages to find it.
   */
  const availableDistricts = useMemo(() => {
    if (region === 'all') return [];
    const present = new Set(
      listings.filter((l) => l.region === region && l.district).map((l) => l.district),
    );
    const known = districtsOf(region)
      .filter((item) => present.has(item.key))
      .map((item) => ({ key: item.key, label: item.label }));

    // Listings from before the district picker hold free text. They are still
    // real produce, so they get an entry under whatever the seller typed.
    const legacy = Array.from(present)
      .filter((key) => key && !DISTRICT_TO_REGION[key])
      .map((key) => ({ key: key as string, label: key as string }))
      .sort((a, b) => a.label.localeCompare(b.label, 'uz'));

    return [...known, ...legacy];
  }, [listings, region]);

  const hasOther = useMemo(() => listings.some((l) => l.category === 'boshqa'), [listings]);

  const visible = useMemo(
    () => applyFilters(listings, { query, category, region, district, sort }),
    [listings, category, district, query, region, sort],
  );

  const isDirty =
    query !== '' ||
    category !== 'all' ||
    region !== 'all' ||
    district !== 'all' ||
    sort !== 'newest';

  // Changing region must clear the district, or the buyer is left filtering
  // Samarkand listings by a Fergana district and sees an empty grid.
  function changeRegion(next: string) {
    setRegion(next);
    setDistrict('all');
  }

  function reset() {
    setQuery('');
    setCategory('all');
    setRegion('all');
    setDistrict('all');
    setSort('newest');
  }

  return (
    <>
      <div className="mt-5">
        <SearchBar value={query} onChange={setQuery} />
      </div>

      <div className="mt-4">
        <CategoryChips value={category} onChange={setCategory} showOther={hasOther} />
      </div>

      <div className="mt-3">
        <FilterBar
          region={region}
          onRegionChange={changeRegion}
          district={district}
          onDistrictChange={setDistrict}
          availableDistricts={availableDistricts}
          sort={sort}
          onSortChange={setSort}
          onReset={reset}
          availableRegions={availableRegions}
          isDirty={isDirty}
        />
      </div>

      <p className="mt-4 text-sm text-muted" aria-live="polite">
        {strings.home.resultsCount(visible.length)}
      </p>

      <div className="mt-3 pb-4">
        <ProductGrid listings={visible} />
      </div>
    </>
  );
}
