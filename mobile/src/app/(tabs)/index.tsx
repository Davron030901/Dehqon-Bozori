/**
 * Bozor — the feed. Search, eleven categories, region → district, sorting,
 * infinite scroll and pull-to-refresh, all served by the same API the website
 * uses, so a filter here returns exactly what it returns there.
 */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GridCell, padToEven } from '@/components/ListingCard';
import SelectSheet from '@/components/SelectSheet';
import { Banner, Chip, EmptyState, ErrorState, Loading } from '@/components/ui';
import { IS_DEMO } from '@/lib/api';
import { CATEGORIES, CATEGORY_ORDER, REGION_ORDER, regionLabel } from '@/lib/catalog';
import { DISTRICT_TO_REGION, districtsOf } from '@/lib/districts';
import { useLanguage } from '@/lib/language';
import { useFacets, useListings } from '@/lib/queries';
import { colors, radius, space } from '@/lib/theme';
import type { CategoryKey, ListingFilters, SortKey } from '@/lib/types';

const SORTS: SortKey[] = ['newest', 'cheapest', 'expensive', 'popular'];

export default function FeedScreen() {
  const { t, lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [filters, setFilters] = useState<ListingFilters>({ category: 'all', sort: 'newest' });

  // Debounced: a slow connection should not be asked for a page per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((f) => (f.query === draft.trim() ? f : { ...f, query: draft.trim() }));
    }, 450);
    return () => clearTimeout(timer);
  }, [draft]);

  const listings = useListings(filters);
  const facets = useFacets(filters.region);
  const items = useMemo(() => {
    const seen = new Set<string>();
    return (listings.data?.pages ?? [])
      .flatMap((p) => p.items)
      .filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true)));
  }, [listings.data]);
  const total = listings.data?.pages[0]?.total ?? 0;
  const counts = facets.data;

  const regionOptions = useMemo(
    () => [
      { key: '', label: t.feed.allRegions },
      ...REGION_ORDER.filter((k) => !counts || (counts.regions[k] ?? 0) > 0 || k === filters.region).map(
        (k) => ({ key: k, label: regionLabel(k, lang), count: counts?.regions[k] }),
      ),
    ],
    [counts, filters.region, lang, t],
  );

  // Districts of the chosen region that have produce today — cities first —
  // plus whatever free text older listings hold.
  const districtOptions = useMemo(() => {
    if (!filters.region) return [];
    const c = counts?.districts ?? {};
    const known = districtsOf(filters.region)
      .filter((d) => (c[d.key] ?? 0) > 0 || d.key === filters.district)
      .map((d) => ({ key: d.key, label: d.label, count: c[d.key], hint: d.type === 'city' ? '🏙' : undefined }));
    const legacy = Object.keys(c)
      .filter((k) => !DISTRICT_TO_REGION[k])
      .map((k) => ({ key: k, label: k, count: c[k] }));
    return [{ key: '', label: t.feed.allDistricts }, ...known, ...legacy];
  }, [counts, filters.region, filters.district, t]);

  const visibleCategories = CATEGORY_ORDER.filter(
    (k) => !counts || (counts.categories[k] ?? 0) > 0 || k === filters.category,
  );
  const dirty = Boolean(filters.query || filters.region || (filters.category && filters.category !== 'all') || filters.sort !== 'newest');

  const header = (
    <View style={styles.header}>
      {IS_DEMO ? <Banner text={t.common.demoNotice} /> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip
          label={`🧺 ${t.common.all}`}
          selected={!filters.category || filters.category === 'all'}
          onPress={() => setFilters((f) => ({ ...f, category: 'all' }))}
        />
        {visibleCategories.map((key) => (
          <Chip
            key={key}
            label={`${CATEGORIES[key].emoji} ${CATEGORIES[key][lang]}`}
            count={counts?.categories[key]}
            selected={filters.category === key}
            onPress={() => setFilters((f) => ({ ...f, category: key as CategoryKey }))}
          />
        ))}
      </ScrollView>

      <View style={styles.filterRow}>
        <SelectSheet
          compact
          title={t.feed.region}
          icon="location-outline"
          value={filters.region ?? ''}
          placeholder={t.feed.allRegions}
          options={regionOptions}
          // A new region makes the old district meaningless.
          onChange={(region) => setFilters((f) => ({ ...f, region: region || undefined, district: undefined }))}
        />
        <SelectSheet
          compact
          title={t.feed.sort}
          icon="swap-vertical"
          value={filters.sort ?? 'newest'}
          placeholder={t.sort.newest}
          options={SORTS.map((k) => ({ key: k, label: t.sort[k] }))}
          onChange={(sort) => setFilters((f) => ({ ...f, sort: sort as SortKey }))}
        />
      </View>
      {districtOptions.length > 1 ? (
        <View style={styles.filterRow}>
          <SelectSheet
            compact
            title={t.feed.district}
            icon="business-outline"
            value={filters.district ?? ''}
            placeholder={t.feed.allDistricts}
            options={districtOptions}
            onChange={(district) => setFilters((f) => ({ ...f, district: district || undefined }))}
          />
        </View>
      ) : null}

      <View style={styles.countRow}>
        <Text style={styles.count}>{listings.isSuccess ? t.feed.results(total) : ' '}</Text>
        {dirty ? (
          <Text
            style={styles.reset}
            onPress={() => {
              setDraft('');
              setFilters({ category: 'all', sort: 'newest' });
            }}
          >
            {t.feed.reset}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <Text style={styles.brand}>🌿 {t.common.appName}</Text>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t.feed.searchPlaceholder}
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            onSubmitEditing={() => setFilters((f) => ({ ...f, query: draft.trim() }))}
            style={styles.searchInput}
            accessibilityLabel={t.feed.searchPlaceholder}
          />
          {draft ? (
            <Ionicons name="close-circle" size={18} color={colors.muted} onPress={() => setDraft('')} />
          ) : null}
        </View>
      </View>

      <FlatList
        data={padToEven(items)}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columns}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        renderItem={({ item }) => <GridCell item={item} />}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (listings.hasNextPage && !listings.isFetchingNextPage) void listings.fetchNextPage();
        }}
        refreshControl={
          <RefreshControl
            refreshing={listings.isRefetching && !listings.isFetchingNextPage}
            onRefresh={() => {
              void listings.refetch();
              void facets.refetch();
            }}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          listings.isPending ? (
            <Loading label={t.common.loading} />
          ) : listings.isError ? (
            <ErrorState message={t.common.offline} retryLabel={t.common.retry} onRetry={() => void listings.refetch()} />
          ) : (
            <EmptyState emoji="🌾" title={t.feed.emptyTitle} body={t.feed.emptyBody} />
          )
        }
        ListFooterComponent={listings.isFetchingNextPage ? <Loading /> : <View style={{ height: space.xl }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.sand },
  top: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.sm, gap: space.sm },
  brand: { fontSize: 22, fontWeight: '800', color: colors.primary700 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.sand200,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.ink, paddingVertical: 10 },
  header: { gap: space.md, paddingBottom: space.md },
  chips: { gap: space.sm, paddingRight: space.lg },
  filterRow: { flexDirection: 'row', gap: space.sm },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  count: { fontSize: 14, color: colors.muted },
  reset: { fontSize: 14, fontWeight: '700', color: colors.primary700, padding: 4 },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  columns: { gap: space.md, marginBottom: space.md },
});
