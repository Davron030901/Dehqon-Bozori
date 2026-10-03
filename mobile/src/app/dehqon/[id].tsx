/** A grower's page: who they are, how to reach them, everything they sell right now. */
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import ContactButtons from '@/components/ContactButtons';
import { GridCell, padToEven } from '@/components/ListingCard';
import { Card, EmptyState, ErrorState, Loading, SectionTitle } from '@/components/ui';
import { formatDate, initial } from '@/lib/format';
import { useLanguage } from '@/lib/language';
import { useListings, useSellerProfile } from '@/lib/queries';
import { colors, space } from '@/lib/theme';

export default function SellerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useLanguage();
  const profile = useSellerProfile(id);
  const listings = useListings({ sellerId: id, sort: 'newest' });
  const items = useMemo(() => (listings.data?.pages ?? []).flatMap((p) => p.items), [listings.data]);

  if (profile.isPending) return <Loading label={t.common.loading} />;
  if (profile.isError || !profile.data) {
    return <ErrorState message={t.common.offline} retryLabel={t.common.retry} onRetry={() => void profile.refetch()} />;
  }
  const s = profile.data;

  return (
    <FlatList
      data={padToEven(items)}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ gap: space.md, marginBottom: space.md }}
      contentContainerStyle={{ padding: space.lg }}
      renderItem={({ item }) => <GridCell item={item} />}
      onEndReached={() => {
        if (listings.hasNextPage && !listings.isFetchingNextPage) void listings.fetchNextPage();
      }}
      ListHeaderComponent={
        <View style={{ gap: space.lg, marginBottom: space.md }}>
          <Card style={{ gap: space.md }}>
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial(s.fullName)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{s.fullName}</Text>
                {s.regionLabel || s.village ? (
                  <Text style={styles.muted}>📍 {[s.village, s.regionLabel].filter(Boolean).join(', ')}</Text>
                ) : null}
                <Text style={styles.stats}>{t.seller.stats(s.activeListings, s.totalListings)}</Text>
                {s.memberSince ? (
                  <Text style={styles.muted}>{t.seller.memberSince(formatDate(s.memberSince, t.months))}</Text>
                ) : null}
              </View>
            </View>
            <ContactButtons phone={s.phone} telegram={s.telegramUsername} />
          </Card>
          <SectionTitle>{t.seller.listings}</SectionTitle>
        </View>
      }
      ListEmptyComponent={
        listings.isPending ? <Loading /> : <EmptyState emoji="🌱" title={t.seller.empty} />
      }
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '800', color: colors.primary700 },
  name: { fontSize: 21, fontWeight: '800', color: colors.ink },
  stats: { fontSize: 15, fontWeight: '600', color: colors.ink, marginTop: 4 },
  muted: { fontSize: 14, color: colors.muted, marginTop: 2 },
});
