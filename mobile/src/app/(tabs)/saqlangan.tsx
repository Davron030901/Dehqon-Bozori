/** Saved listings — on the phone for guests, in the account (shared with the bot and the site) when signed in. */
import { router } from 'expo-router';
import { FlatList, RefreshControl } from 'react-native';

import { GridCell, padToEven } from '@/components/ListingCard';
import { Button, EmptyState, ErrorState, Loading } from '@/components/ui';
import { useFavorites } from '@/lib/favorites';
import { useLanguage } from '@/lib/language';
import { useListingsByIds } from '@/lib/queries';
import { colors, space } from '@/lib/theme';

export default function SavedScreen() {
  const { t } = useLanguage();
  const { ids } = useFavorites();
  const saved = useListingsByIds(ids);
  const items = saved.data ?? [];

  return (
    <FlatList
      data={padToEven(items)}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ gap: space.md, marginBottom: space.md }}
      contentContainerStyle={{ padding: space.lg, flexGrow: 1 }}
      renderItem={({ item }) => <GridCell item={item} />}
      refreshControl={
        <RefreshControl
          refreshing={saved.isRefetching}
          onRefresh={() => void saved.refetch()}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      ListEmptyComponent={
        ids.length && saved.isPending ? (
          <Loading label={t.common.loading} />
        ) : saved.isError ? (
          <ErrorState message={t.common.offline} retryLabel={t.common.retry} onRetry={() => void saved.refetch()} />
        ) : (
          <EmptyState
            emoji="🤍"
            title={t.favorites.empty}
            body={t.favorites.emptyBody}
            action={<Button title={t.favorites.browse} icon="storefront-outline" onPress={() => router.navigate('/')} />}
          />
        )
      }
    />
  );
}
