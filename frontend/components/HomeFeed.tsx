'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';

import CategoryChips, { type CategoryValue } from '@/components/CategoryChips';
import FilterBar, { type FilterOption } from '@/components/FilterBar';
import ProductGrid from '@/components/ProductGrid';
import SearchBar from '@/components/SearchBar';
import { filtersToSearch, getListingsPage } from '@/lib/api';
import { DISTRICT_TO_REGION, districtsOf } from '@/lib/districts';
import { regionLabel, regions, strings } from '@/lib/strings';
import type { Facets, Listing, ListingFilters, ListingPage, SortKey } from '@/lib/types';

/**
 * The interactive half of the homepage.
 *
 * The filters live in the URL (`/?category=honey&region=samarkand`), and the
 * server component fetches exactly that page from the database. So a filtered
 * view can be shared in Telegram, the back button works, and the browser never
 * downloads the whole bazaar to show 24 listings of it.
 *
 * The "load more" button appends the next page from the client; changing a
 * filter starts again from page one.
 */
export default function HomeFeed({
  initial,
  filters,
  facets,
}: {
  initial: ListingPage;
  filters: Required<ListingFilters>;
  facets: Facets;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [extra, setExtra] = useState<Listing[]>([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const filterKey = filtersToSearch(filters);

  // A new filter is a new list — drop whatever "load more" had appended.
  useEffect(() => {
    setExtra([]);
    setPage(1);
  }, [filterKey]);

  function navigate(next: ListingFilters) {
    startTransition(() => {
      router.replace(`${pathname}${filtersToSearch(next)}`, { scroll: false });
    });
  }

  async function loadMore() {
    setLoadingMore(true);
    const { data } = await getListingsPage(filters, page + 1);
    setExtra((current) => [...current, ...data.items]);
    setPage(page + 1);
    setLoadingMore(false);
  }

  // Auto-refresh re-renders page one underneath us; de-duplicate so a listing
  // that slid onto page two is not shown twice.
  const items = useMemo(() => {
    const seen = new Set<string>();
    return [...initial.items, ...extra].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [initial.items, extra]);

  // The order of `regions` in strings.ts, Samarkand first — not a locale sort.
  // `localeCompare(…, 'uz')` orders "Toshkent shahri" and "Toshkent viloyati"
  // differently in Node's ICU and in Chrome's, and the server-rendered list
  // then fails to hydrate.
  const availableRegions = useMemo<FilterOption[]>(() => {
    return regions
      .filter((r) => (facets.regions[r.key] ?? 0) > 0 || r.key === filters.region)
      .map((r) => ({ key: r.key, label: r.label, count: facets.regions[r.key] }));
  }, [facets.regions, filters.region]);

  /**
   * Districts of the chosen region that have produce today, cities first (the
   * order districts.ts uses — a trader looking for "Samarqand shahri" should
   * not scroll past thirteen villages). Listings from before the district
   * picker hold free text; they still get an entry under what the seller typed.
   */
  const availableDistricts = useMemo<FilterOption[]>(() => {
    if (filters.region === 'all') return [];
    const counts = facets.districts;
    const known = districtsOf(filters.region)
      .filter((d) => (counts[d.key] ?? 0) > 0 || d.key === filters.district)
      .map((d) => ({ key: d.key, label: d.label, count: counts[d.key] }));
    const legacy = Object.keys(counts)
      .filter((key) => !DISTRICT_TO_REGION[key])
      .map((key) => ({ key, label: key, count: counts[key] }))
      // Code-point order: identical on the server and in every browser.
      .sort((a, b) => (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));
    return [...known, ...legacy];
  }, [facets.districts, filters.region, filters.district]);

  const isDirty = filterKey !== '';
  const hasMore = page < initial.pages && items.length < initial.total;

  return (
    <>
      <div className="mt-5">
        <SearchBar value={filters.query} onChange={(query) => navigate({ ...filters, query })} />
      </div>

      <div className="mt-4">
        <CategoryChips
          value={filters.category as CategoryValue}
          counts={facets.categories}
          onChange={(category) => navigate({ ...filters, category })}
        />
      </div>

      <div className="mt-3">
        <FilterBar
          region={filters.region}
          // A new region makes the old district meaningless — clear it, or the
          // buyer filters Samarkand listings by a Fergana district.
          onRegionChange={(region) => navigate({ ...filters, region, district: 'all' })}
          district={filters.district}
          onDistrictChange={(district) => navigate({ ...filters, district })}
          availableDistricts={availableDistricts}
          sort={filters.sort}
          onSortChange={(sort: SortKey) => navigate({ ...filters, sort })}
          onReset={() => navigate({})}
          availableRegions={availableRegions}
          isDirty={isDirty}
        />
      </div>

      <p className="mt-4 text-sm text-muted" aria-live="polite">
        {strings.home.resultsCount(initial.total)}
        {filters.region !== 'all' && ` · ${regionLabel(filters.region)}`}
      </p>

      <div className={`mt-3 pb-4 transition-opacity ${pending ? 'opacity-50' : ''}`}>
        <ProductGrid listings={items} />
      </div>

      {hasMore && (
        <div className="pb-8 text-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="btn-ghost min-w-[12rem]"
          >
            {loadingMore ? strings.home.loadingMore : strings.home.loadMore}
          </button>
        </div>
      )}
    </>
  );
}
