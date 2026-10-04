/** Mening e'lonlarim — the seller's own listings: sold / active, edit, delete, and how many buyers called. */
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import LoginPanel from '@/components/LoginPanel';
import { Badge, Banner, Button, EmptyState, ErrorState, Loading } from '@/components/ui';
import * as api from '@/lib/api';
import { formatDate, formatPrice } from '@/lib/format';
import { useLanguage } from '@/lib/language';
import { useMyListings } from '@/lib/queries';
import { useSession } from '@/lib/session';
import { colors, radius, shadow, space } from '@/lib/theme';
import type { Listing } from '@/lib/types';

export default function CabinetScreen() {
  const { t, lang } = useLanguage();
  const { token } = useSession();
  const mine = useMyListings();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <ScrollView contentContainerStyle={{ padding: space.lg }}>
        <LoginPanel />
      </ScrollView>
    );
  }

  async function act(listing: Listing, action: 'sold' | 'active' | 'delete') {
    if (!token) return;
    setBusy(listing.id);
    setError(null);
    try {
      if (action === 'delete') await api.deleteListing(token, listing.id);
      else await api.updateListing(token, listing.id, { status: action }, lang);
      // Every view of this listing — its own screen, the feed, saved lists,
      // the seller page — not only the cabinet.
      await queryClient.invalidateQueries();
      if (action === 'delete') queryClient.removeQueries({ queryKey: ['listing', listing.id] });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    }
    setBusy(null);
  }

  function confirmDelete(listing: Listing) {
    Alert.alert(t.cabinet.confirmDelete(listing.productName), undefined, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.delete, style: 'destructive', onPress: () => void act(listing, 'delete') },
    ]);
  }

  const rows = mine.data ?? [];
  const views = rows.reduce((sum, l) => sum + l.views, 0);
  const buyers = rows.reduce((sum, l) => sum + (l.contactsCount ?? 0), 0);

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: space.lg, gap: space.md, flexGrow: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={mine.isRefetching}
          onRefresh={() => void mine.refetch()}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      ListHeaderComponent={
        <View style={{ gap: space.md }}>
          {rows.length ? (
            <View style={styles.stats}>
              {[
                [rows.length, t.cabinet.total],
                [views, t.cabinet.views],
                [buyers, t.cabinet.buyers],
              ].map(([value, label]) => (
                <View key={String(label)} style={styles.stat}>
                  <Text style={styles.statValue}>{value}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {error ? <Banner tone="error" text={error} /> : null}
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.item}>
          <Pressable style={styles.itemTop} onPress={() => router.push(`/mahsulot/${item.id}`)}>
            <View style={styles.thumb}>
              {item.photoUrl ? (
                <Image source={{ uri: item.photoUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <Text style={{ fontSize: 30 }}>{item.categoryEmoji}</Text>
              )}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.productName}
                </Text>
                <Badge label={item.isSoldOut ? t.cabinet.sold : t.cabinet.active} tone={item.isSoldOut ? 'sold' : 'primary'} />
              </View>
              <Text style={styles.price}>
                {formatPrice(item.price)} {t.common.currency}/{item.unitLabel}
              </Text>
              <Text style={styles.meta}>
                {formatDate(item.createdAt, t.months)} · 👁 {item.views}
              </Text>
              {item.contactsCount ? (
                <Text style={styles.contacts}>📞 {t.cabinet.contacts(item.contactsCount)}</Text>
              ) : null}
            </View>
          </Pressable>
          <View style={styles.actions}>
            <Button
              small
              variant="ghost"
              icon={item.isSoldOut ? 'refresh' : 'checkmark-done'}
              title={item.isSoldOut ? t.cabinet.markActive : t.cabinet.markSold}
              loading={busy === item.id}
              style={{ flexGrow: 1 }}
              onPress={() => void act(item, item.isSoldOut ? 'active' : 'sold')}
            />
            <Button
              small
              variant="ghost"
              icon="create-outline"
              title={t.cabinet.edit}
              onPress={() => router.push(`/tahrirlash/${item.id}`)}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.common.delete}
              onPress={() => confirmDelete(item)}
              style={styles.delete}
            >
              <Ionicons name="trash-outline" size={18} color={colors.red} />
            </Pressable>
          </View>
        </View>
      )}
      ListEmptyComponent={
        mine.isPending ? (
          <Loading label={t.common.loading} />
        ) : mine.isError ? (
          <ErrorState message={t.common.offline} retryLabel={t.common.retry} onRetry={() => void mine.refetch()} />
        ) : (
          <EmptyState
            emoji="🌱"
            title={t.cabinet.empty}
            action={<Button title={t.cabinet.emptyCta} icon="add" onPress={() => router.navigate('/sotish')} />}
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: space.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.sand200,
    padding: space.md,
  },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.primary700 },
  statLabel: { fontSize: 12, color: colors.muted },
  item: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.sand200,
    padding: space.md,
    gap: space.md,
    ...shadow,
  },
  itemTop: { flexDirection: 'row', gap: space.md },
  thumb: {
    width: 76,
    height: 76,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.primary50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.ink },
  price: { fontSize: 15, fontWeight: '800', color: colors.primary700 },
  meta: { fontSize: 12, color: colors.muted },
  contacts: { fontSize: 12, fontWeight: '700', color: colors.primary700 },
  actions: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  delete: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.red200,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
