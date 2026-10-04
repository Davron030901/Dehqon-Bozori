/**
 * Data hooks. React Query caches every response, so going back to the feed
 * from a listing is instant and a dropped 3G connection shows the last good
 * data instead of a blank screen.
 */
import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';
import { useLanguage } from './language';
import { useSession } from './session';
import type { Listing, ListingFilters } from './types';

export function useListings(filters: ListingFilters) {
  const { lang } = useLanguage();
  return useInfiniteQuery({
    queryKey: ['listings', filters, lang],
    queryFn: ({ pageParam }) => api.fetchListings(filters, pageParam, lang),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.pages ? last.page + 1 : undefined),
    // While a new filter loads, keep the old grid on screen instead of a
    // spinner — public data, so showing it a moment longer is harmless.
    placeholderData: keepPreviousData,
  });
}

export function useFacets(region?: string) {
  return useQuery({
    queryKey: ['facets', region ?? ''],
    queryFn: () => api.fetchFacets(region),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useListing(id: string | undefined) {
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['listing', id, lang],
    // Only the first load of this screen is a buyer's view. Refetches after an
    // edit, a "sold" tap or a pull-to-refresh must not count again.
    queryFn: () => {
      const seen = queryClient.getQueryData(['listing', id, lang]) !== undefined;
      return api.fetchListing(id!, lang, !seen);
    },
    enabled: Boolean(id),
  });
}

export function useSimilar(listing: Listing | undefined) {
  const { lang } = useLanguage();
  return useQuery({
    queryKey: ['similar', listing?.id, lang],
    queryFn: () => api.fetchSimilar(listing!, lang),
    enabled: Boolean(listing),
  });
}

export function useListingsByIds(ids: string[]) {
  const { lang } = useLanguage();
  return useQuery({
    queryKey: ['byIds', ids, lang],
    queryFn: () => api.fetchListingsByIds(ids, lang),
    // Un-hearting a card changes the key. Keep the grid (minus that card) on
    // screen while it reloads, instead of a full-screen spinner on 3G.
    placeholderData: (previous) => previous?.filter((listing) => ids.includes(listing.id)),
  });
}

export function useSellerProfile(id: string | undefined) {
  const { lang } = useLanguage();
  return useQuery({
    queryKey: ['seller', id, lang],
    queryFn: () => api.fetchSellerProfile(id!, lang),
    enabled: Boolean(id),
  });
}

export function useMyListings() {
  const { lang } = useLanguage();
  const { token } = useSession();
  return useQuery({
    queryKey: ['mine', token, lang],
    queryFn: () => api.fetchMyListings(token!, lang),
    enabled: Boolean(token),
  });
}

export function useDashboard() {
  const { token, session } = useSession();
  return useQuery({
    queryKey: ['dashboard', token],
    queryFn: () => api.fetchDashboard(token!),
    enabled: Boolean(token && session?.isAdmin),
  });
}

export function useReports() {
  const { token, session } = useSession();
  return useQuery({
    queryKey: ['reports', token],
    queryFn: () => api.fetchReports(token!),
    enabled: Boolean(token && session?.isAdmin),
  });
}
