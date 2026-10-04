'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';

import CategoryChips, { type CategoryValue } from '@/components/CategoryChips';
import FilterBar, { type FilterOption } from '@/components/FilterBar';
import ProductGrid from '@/components/ProductGrid';
import SearchBar from '@/components/SearchBar';
import { API_URL, filtersToSearch, getListingsPage } from '@/lib/api';
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
  const [loadFailed, setLoadFailed] = useState(false);
  // Bumped on every filter change, so a "load more" that was still on the way
  // for the old filter is thrown away instead of appended to the new list.
  const generation = useRef(0);

  const filterKey = filtersToSearch(filters);

  // A new filter is a new list — drop whatever "load more" had appended.
  useEffect(() => {
    generation.current += 1;
    setExtra([]);
    setPage(1);
    setLoadingMore(false);
    setLoadFailed(false);
  }, [filterKey]);

  /*
   * What the buyer has asked for, including navigations still on their way.
   * `filters` only changes once the server has answered — seconds on 3G — so
   * building the next URL from it would drop a chip tapped in the meantime
   * (tap "Asal", then pick Samarqand: the honey filter was lost).
   */
  const requested = useRef<ListingFilters>(filters);
  useEffect(() => {
    // Nothing in flight: the URL is the truth again (this also covers the back button).
    if (!pending) requested.current = filters;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, filterKey]);

  function navigate(patch: ListingFilters, { reset = false } = {}) {
    const next = reset ? patch : { ...requested.current, ...patch };
    requested.current = next;
    startTransition(() => {
      router.replace(`${pathname}${filtersToSearch(next)}`, { scroll: false });
    });
  }

  async function loadMore() {
    const mine = generation.current;
    const nextPage = page + 1;
    setLoadingMore(true);
    setLoadFailed(false);
    const { data, isDemo } = await getListingsPage(filters, nextPage);
    if (mine !== generation.current) return; // the filter changed meanwhile
    setLoadingMore(false);
    // With a live API a demo page means the request failed: keep the page
    // number, so the next tap asks for the same page instead of skipping it.
    if (isDemo && API_URL) {
      setLoadFailed(true);
      return;
    }
    setExtra((current) => [...current, ...data.items]);
    setPage(nextPage);
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
        <SearchBar value={filters.query} onChange={(query) => navigate({ query })} />
      </div>

      <div className="mt-4">
        <CategoryChips
          value={filters.category as CategoryValue}
          counts={facets.categories}
          onChange={(category) => navigate({ category })}
        />
      </div>

      <div className="mt-3">
        <FilterBar
          region={filters.region}
          // A new region makes the old district meaningless — clear it, or the
          // buyer filters Samarkand listings by a Fergana district.
          onRegionChange={(region) => navigate({ region, district: 'all' })}
          district={filters.district}
          onDistrictChange={(district) => navigate({ district })}
          availableDistricts={availableDistricts}
          sort={filters.sort}
          onSortChange={(sort: SortKey) => navigate({ sort })}
          onReset={() => navigate({}, { reset: true })}
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
          {loadFailed && (
            <p className="mb-3 text-sm text-red-700" role="alert">
              {strings.home.loadMoreFailed}
            </p>
          )}
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
